begin;
alter table public.conversations add column if not exists group_settings jsonb not null default '{}';
alter table public.messages
  add column if not exists group_request_hash text,
  add column if not exists source_prayer_id uuid references public.prayer_requests(id) on delete set null;
alter table public.conversation_participants add column if not exists group_role text not null default 'member'
  check (group_role in ('admin','leader','member'));
-- A member must not promote themselves or move their participant row.
revoke update on public.conversation_participants from authenticated;
grant update(last_read_at,is_muted) on public.conversation_participants to authenticated;
revoke update on public.conversations from authenticated;
grant update(updated_at) on public.conversations to authenticated;
create or replace function public.group_prayer_is_visible(g uuid,rid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_chat_participant(g) and exists(select 1 from public.conversations where id=g and type='group') and exists(
    select 1 from public.prayer_requests r where r.id=rid and not exists(
      select 1 from public.conversation_participants cp where cp.conversation_id=g and (
        public.is_blocked_between(cp.user_id,r.author_id) or not (
          cp.user_id=r.author_id or (r.status<>'archived' and (
            r.audience='everyone' or (r.audience='friends' and exists(
              select 1 from public.friend_requests f where f.status='accepted' and
              ((f.sender_id=cp.user_id and f.receiver_id=r.author_id) or
               (f.receiver_id=cp.user_id and f.sender_id=r.author_id)))))))
      )
    )
  );
$$;
revoke all on function public.group_prayer_is_visible(uuid,uuid) from public,anon;
grant execute on function public.group_prayer_is_visible(uuid,uuid) to authenticated;
drop policy if exists chat_message_read on public.messages;
create policy chat_message_read on public.messages for select to authenticated using (
  public.is_chat_participant(conversation_id) and (
    not exists(select 1 from public.conversations c where c.id=messages.conversation_id and c.type='group')
    or (not public.is_blocked_between(auth.uid(),sender_id) and
      (type<>'prayer_share' or public.group_prayer_is_visible(conversation_id,source_prayer_id)))
  )
);
drop policy if exists chat_reaction_read on public.message_reactions;
create policy chat_reaction_read on public.message_reactions for select to authenticated using (
  not public.is_blocked_between(auth.uid(),user_id) and exists (
    select 1 from public.messages m where m.id=message_id and public.is_chat_participant(m.conversation_id)
  )
);
drop policy if exists chat_reaction_delete on public.message_reactions;
create policy chat_reaction_delete on public.message_reactions for delete to authenticated using (
  user_id=auth.uid() and exists(select 1 from public.messages m where m.id=message_id and public.can_send_to_chat(m.conversation_id))
);

create or replace function public.require_group_chat_access(g uuid,u uuid,w boolean default false,a boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from u or not exists(
    select 1 from public.conversations c join public.conversation_participants p on p.conversation_id=c.id
    where c.id=g and c.type='group' and p.user_id=u and (not a or p.group_role='admin')
  ) then raise exception 'Group unavailable or access denied' using errcode='42501'; end if;
  if exists(select 1 from public.account_deletion_jobs where user_id=u)
    then raise exception 'Account deletion in progress'; end if;
  if w and not public.can_send_to_chat(g) then raise exception 'Messaging is unavailable while a group member is blocked' using errcode='42501'; end if;
end $$;
revoke all on function public.require_group_chat_access(uuid,uuid,boolean,boolean) from public,anon,authenticated;

create or replace function public.create_prayer_chat_group(p_expected_user_id uuid,p_client_id uuid,p_name text,p_settings jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare existing public.conversations;
begin
  if auth.uid() is null or auth.uid() is distinct from p_expected_user_id then raise exception 'Account changed'; end if;
  if p_client_id is null or p_name is null or length(trim(p_name)) not between 1 and 100
    or jsonb_typeof(p_settings) is distinct from 'object'
    or coalesce(p_settings->>'focus','Prayer') not in ('Prayer','Bible Study','Support','Testimony')
    or (p_settings ? 'private' and jsonb_typeof(p_settings->'private')<>'boolean')
    or (p_settings ? 'safeSpace' and jsonb_typeof(p_settings->'safeSpace')<>'boolean')
    then raise exception 'Invalid group details'; end if;
  if exists(select 1 from public.account_deletion_jobs where user_id=auth.uid()) then raise exception 'Account deletion in progress'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_client_id::text,27));
  select * into existing from public.conversations where id=p_client_id;
  if found then
    if existing.type='group' and existing.group_settings->>'createdBy'=auth.uid()::text
      and exists(select 1 from public.conversation_participants where conversation_id=existing.id and user_id=auth.uid())
      then return existing.id; end if;
    raise exception 'Group identifier unavailable';
  end if;
  insert into public.conversations(id,type,name,group_settings) values(p_client_id,'group',trim(p_name),
    jsonb_build_object('createdBy',auth.uid(),'focus',coalesce(p_settings->>'focus','Prayer'),
      'private',coalesce(p_settings->'private','true'::jsonb),'safeSpace',coalesce(p_settings->'safeSpace','true'::jsonb)));
  insert into public.conversation_participants(conversation_id,user_id,group_role)
    values(p_client_id,auth.uid(),'admin');
  return p_client_id;
end $$;

create or replace function public.list_prayer_chat_groups(p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_expected_user_id then raise exception 'Account changed'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',coalesce(c.name,'Prayer group'),
    'memberCount',(select count(*) from public.conversation_participants allp where allp.conversation_id=c.id),
    'isAdmin',p.group_role='admin','updatedAt',c.updated_at) order by c.updated_at desc,c.id)
    from public.conversations c join public.conversation_participants p on p.conversation_id=c.id
    where c.type='group' and p.user_id=auth.uid()),'[]'::jsonb);
end $$;

create or replace function public.get_group_chat(p_group_id uuid,p_expected_user_id uuid,p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare before_time timestamptz; result jsonb;
begin
  perform public.require_group_chat_access(p_group_id,p_expected_user_id);
  if p_before_id is not null then
    select created_at into before_time from public.messages where id=p_before_id and conversation_id=p_group_id;
    if not found then raise exception 'Message cursor unavailable'; end if;
  end if;
  select jsonb_build_object(
    'id',c.id,'name',coalesce(c.name,'Prayer group'),'settings',c.group_settings,
    'canSend',public.can_send_to_chat(c.id),
    'members',coalesce((select jsonb_agg(jsonb_build_object('id',cp.user_id,
      'name',coalesce(nullif(trim(p.full_name),''),'Someone'),'avatar',coalesce(p.avatar_url,''),
      'role',cp.group_role,'joinedAt',cp.created_at) order by cp.created_at,cp.user_id)
      from public.conversation_participants cp left join public.profiles p on p.id=cp.user_id
      where cp.conversation_id=c.id),'[]'::jsonb),
    'messages',coalesce((select jsonb_agg(jsonb_build_object(
      'id',m.id,'senderId',coalesce(m.sender_id::text,''),'senderName',coalesce(nullif(trim(p.full_name),''),'Deleted account'),
      'senderAvatar',coalesce(p.avatar_url,''),'content',m.content,'createdAt',m.created_at,
      'prayerContent',case when m.type='prayer_share' then (select content from public.prayer_requests where id=m.source_prayer_id) else null end,
      'reply',case when reply.id is null then null else jsonb_build_object(
        'id',reply.id,'senderName',coalesce(rp.full_name,'Deleted account'),'content',reply.content) end,
      'reactions',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'userId',r.user_id,
        'userName',coalesce(ap.full_name,'Someone'),'userAvatar',coalesce(ap.avatar_url,''),
        'type',r.reaction_type,'createdAt',r.created_at) order by r.created_at,r.id)
        from public.message_reactions r left join public.profiles ap on ap.id=r.user_id
        where r.message_id=m.id and not public.is_blocked_between(auth.uid(),r.user_id)),'[]'::jsonb)
    ) order by m.created_at,m.id)
    from (select * from public.messages where conversation_id=c.id and not deleted_for_everyone
      and not public.is_blocked_between(auth.uid(),sender_id)
      and (type<>'prayer_share' or public.group_prayer_is_visible(c.id,source_prayer_id))
      and (p_before_id is null or (created_at,id)<(before_time,p_before_id))
      order by created_at desc,id desc limit 100) m
    left join public.profiles p on p.id=m.sender_id
    left join public.messages reply on reply.id=(case when m.reply_to->>'id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then (m.reply_to->>'id')::uuid end) and reply.conversation_id=c.id
      and not reply.deleted_for_everyone and not public.is_blocked_between(auth.uid(),reply.sender_id)
      and (reply.type<>'prayer_share' or public.group_prayer_is_visible(c.id,reply.source_prayer_id))
    left join public.profiles rp on rp.id=reply.sender_id),'[]'::jsonb)
  ) into result from public.conversations c where c.id=p_group_id;
  return result;
end $$;

create or replace function public.send_group_chat_message(p_group_id uuid,p_expected_user_id uuid,p_client_id uuid,
  p_content text,p_reply_id uuid default null,p_prayer_id uuid default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare existing public.messages; quoted jsonb; prayer public.prayer_requests;
  request_hash text := pg_catalog.md5(jsonb_build_object('content',trim(p_content),'reply',p_reply_id,'prayer',p_prayer_id)::text);
begin
  perform 1 from public.conversations where id=p_group_id for update;
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,true);
  if p_client_id is null or p_content is null or length(p_content)>20000
    or (length(trim(p_content))=0 and p_prayer_id is null) then raise exception 'Enter a message (maximum 20,000 characters)'; end if;
  select * into existing from public.messages where id=p_client_id;
  if found then
    if existing.conversation_id=p_group_id and existing.sender_id=auth.uid() and existing.content=trim(p_content)
      and existing.group_request_hash=request_hash and not existing.deleted_for_everyone
      then return existing.id; end if;
    raise exception 'Message identifier unavailable';
  end if;
  if p_reply_id is not null then
    select jsonb_build_object('id',m.id,'senderName',coalesce(p.full_name,'Deleted account'),'content',m.content)
      into quoted from public.messages m left join public.profiles p on p.id=m.sender_id
      where m.id=p_reply_id and m.conversation_id=p_group_id and not m.deleted_for_everyone
        and not public.is_blocked_between(auth.uid(),m.sender_id)
        and (m.type<>'prayer_share' or public.group_prayer_is_visible(p_group_id,m.source_prayer_id));
    if quoted is null then raise exception 'Reply target is unavailable'; end if;
  end if;
  if p_prayer_id is not null then
    select * into prayer from public.prayer_requests where id=p_prayer_id;
    if not found then raise exception 'Shared prayer is unavailable'; end if;
    if not public.group_prayer_is_visible(p_group_id,p_prayer_id) then raise exception 'This prayer cannot be shared with every member of this group'; end if;
    -- Sharing a controlled post must not bypass its audience for other members.
    if exists(select 1 from public.conversation_participants cp where cp.conversation_id=p_group_id and (
      public.is_blocked_between(cp.user_id,prayer.author_id) or not (
        cp.user_id=prayer.author_id or (prayer.status<>'archived' and
          (prayer.audience='everyone' or (prayer.audience='friends' and exists(
            select 1 from public.friend_requests f where f.status='accepted' and
              ((f.sender_id=cp.user_id and f.receiver_id=prayer.author_id) or
               (f.receiver_id=cp.user_id and f.sender_id=prayer.author_id)))))))
    )) then raise exception 'This prayer cannot be shared with every member of this group'; end if;
  end if;
  insert into public.messages(id,conversation_id,sender_id,content,reply_to,type,prayer_request_content,source_prayer_id,group_request_hash)
    values(p_client_id,p_group_id,auth.uid(),trim(p_content),quoted,
      case when p_prayer_id is null then 'text' else 'prayer_share' end,prayer.content,p_prayer_id,request_hash);
  update public.conversations set updated_at=now() where id=p_group_id;
  return p_client_id;
end $$;

drop function if exists public.react_to_group_message(uuid,uuid,uuid,text);
create or replace function public.react_to_group_message(p_group_id uuid,p_expected_user_id uuid,p_message_id uuid,p_reaction text,p_active boolean default true)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,true);
  if p_reaction not in ('pray','amen','support') or p_reaction is null then raise exception 'Unsupported reaction'; end if;
  perform 1 from public.messages where id=p_message_id and conversation_id=p_group_id and not deleted_for_everyone
    and not public.is_blocked_between(auth.uid(),sender_id) for update;
  if not found then raise exception 'Message unavailable'; end if;
  if p_active is null then raise exception 'Specify the reaction state'; end if;
  if not p_active then
    delete from public.message_reactions where message_id=p_message_id and user_id=auth.uid() and reaction_type=p_reaction;
  else
    insert into public.message_reactions(message_id,user_id,reaction_type) values(p_message_id,auth.uid(),p_reaction)
      on conflict(message_id,user_id) do update set reaction_type=excluded.reaction_type,created_at=now();
  end if;
end $$;

create or replace function public.delete_group_chat_message(p_group_id uuid,p_expected_user_id uuid,p_message_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,true);
  update public.messages set deleted_for_everyone=true,content='',prayer_request_content=null,image_url=null,image_path=null,reply_to=null
    where id=p_message_id and conversation_id=p_group_id and sender_id=auth.uid();
  if not found then raise exception 'Only your own messages can be removed'; end if;
  delete from public.message_reactions where message_id=p_message_id;
  update public.messages set reply_to=null where conversation_id=p_group_id and reply_to->>'id'=p_message_id::text;
end $$;

create or replace function public.group_chat_invite_candidates(p_group_id uuid,p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,false,true);
  return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(p.full_name,'Someone'),'avatar',coalesce(p.avatar_url,'')) order by p.full_name,p.id)
    from public.profiles p where p.id<>auth.uid() and not public.is_blocked_between(auth.uid(),p.id)
    and exists(select 1 from public.friend_requests f where f.status='accepted' and
      ((f.sender_id=auth.uid() and f.receiver_id=p.id) or (f.receiver_id=auth.uid() and f.sender_id=p.id)))
    and not exists(select 1 from public.conversation_participants cp where cp.conversation_id=p_group_id and cp.user_id=p.id)
    and not exists(select 1 from public.account_deletion_jobs d where d.user_id=p.id)),'[]'::jsonb);
end $$;

create or replace function public.change_group_chat_member(p_group_id uuid,p_expected_user_id uuid,p_user_id uuid,p_action text)
returns void language plpgsql security definer set search_path = ''
as $$
declare previous text;
begin
  perform 1 from public.conversations where id=p_group_id for update;
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,false,p_action<>'leave');
  if p_action='leave' and p_user_id is distinct from auth.uid() then raise exception 'You can only leave for yourself'; end if;
  if p_action='add' then
    if not exists(select 1 from public.friend_requests f where f.status='accepted' and
      ((f.sender_id=auth.uid() and f.receiver_id=p_user_id) or (f.receiver_id=auth.uid() and f.sender_id=p_user_id)))
      or exists(select 1 from public.account_deletion_jobs where user_id=p_user_id)
      or exists(select 1 from public.conversation_participants cp where cp.conversation_id=p_group_id
        and public.is_blocked_between(cp.user_id,p_user_id))
      then raise exception 'Only accepted, unblocked friends can be added'; end if;
    if (select count(*) from public.conversation_participants where conversation_id=p_group_id)>=100
      then raise exception 'Group member limit reached (100)'; end if;
    insert into public.conversation_participants(conversation_id,user_id) values(p_group_id,p_user_id) on conflict do nothing;
    return;
  end if;
  if p_action not in ('leave','remove','admin','leader','member') or p_action is null then raise exception 'Invalid membership change'; end if;
  select group_role into previous from public.conversation_participants where conversation_id=p_group_id and user_id=p_user_id;
  if not found then raise exception 'Member unavailable'; end if;
  if previous='admin' and p_action<>'admin'
    and (select count(*) from public.conversation_participants where conversation_id=p_group_id and group_role='admin')<=1
    and (p_action not in ('leave','remove') or (select count(*) from public.conversation_participants where conversation_id=p_group_id)>1)
    then raise exception 'Assign another admin first'; end if;
  if p_action in ('leave','remove') then
    delete from public.conversation_participants where conversation_id=p_group_id and user_id=p_user_id;
  else
    update public.conversation_participants set group_role=p_action where conversation_id=p_group_id and user_id=p_user_id;
  end if;
end $$;

revoke all on function public.create_prayer_chat_group(uuid,uuid,text,jsonb),
  public.list_prayer_chat_groups(uuid),public.get_group_chat(uuid,uuid,uuid),
  public.send_group_chat_message(uuid,uuid,uuid,text,uuid,uuid),public.react_to_group_message(uuid,uuid,uuid,text,boolean),
  public.delete_group_chat_message(uuid,uuid,uuid),public.group_chat_invite_candidates(uuid,uuid),
  public.change_group_chat_member(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.create_prayer_chat_group(uuid,uuid,text,jsonb),
  public.list_prayer_chat_groups(uuid),public.get_group_chat(uuid,uuid,uuid),
  public.send_group_chat_message(uuid,uuid,uuid,text,uuid,uuid),public.react_to_group_message(uuid,uuid,uuid,text,boolean),
  public.delete_group_chat_message(uuid,uuid,uuid),public.group_chat_invite_candidates(uuid,uuid),
  public.change_group_chat_member(uuid,uuid,uuid,text) to authenticated;

-- Realtime is an optimization; clients also poll and refetch after reconnecting.
do $$ declare tab text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach tab in array array['messages','message_reactions','conversation_participants'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tab)
        then execute format('alter publication supabase_realtime add table public.%I',tab); end if;
    end loop;
  end if;
end $$;
commit;
