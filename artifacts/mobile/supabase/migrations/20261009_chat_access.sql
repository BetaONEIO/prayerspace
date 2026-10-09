begin;

-- Preserve existing IDs/metadata; absent historical message content cannot be
-- reconstructed. These defaults support new messages without inventing text.
alter table public.messages
  add column if not exists content text not null default '',
  add column if not exists type text not null default 'text',
  add column if not exists prayer_request_content text,
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists reply_to jsonb,
  add column if not exists is_edited boolean not null default false,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_for_everyone boolean not null default false,
  add column if not exists deleted_for_sender boolean not null default false;

alter table public.conversation_participants
  add column if not exists last_read_at timestamptz,
  add column if not exists is_muted boolean not null default false;

create or replace function public.is_chat_participant(chat_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.conversation_participants
    where conversation_id=chat_id and user_id=auth.uid()
  );
$$;

create or replace function public.can_send_to_chat(chat_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_chat_participant(chat_id) and not exists (
    select 1 from public.conversation_participants cp
    join public.blocked_users b on
      (b.blocker_id=auth.uid() and b.blocked_id=cp.user_id)
      or (b.blocked_id=auth.uid() and b.blocker_id=cp.user_id)
    where cp.conversation_id=chat_id
  );
$$;

create or replace function public.get_or_create_dm(target_user_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); chat_id uuid;
begin
  if actor is null or actor=target_user_id or target_user_id is null then
    raise exception 'A different signed-in user is required' using errcode='42501';
  end if;
  if exists(select 1 from public.blocked_users where
    (blocker_id=actor and blocked_id=target_user_id) or
    (blocker_id=target_user_id and blocked_id=actor)) then
    raise exception 'This conversation is blocked' using errcode='42501';
  end if;
  if not exists(select 1 from public.friend_requests where status='accepted' and
    ((sender_id=actor and receiver_id=target_user_id) or
     (receiver_id=actor and sender_id=target_user_id))) then
    raise exception 'Accept a friend request before starting a chat' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    least(actor::text,target_user_id::text)||':'||greatest(actor::text,target_user_id::text),0));
  select c.id into chat_id from public.conversations c
  where c.type='dm'
    and exists(select 1 from public.conversation_participants where conversation_id=c.id and user_id=actor)
    and exists(select 1 from public.conversation_participants where conversation_id=c.id and user_id=target_user_id)
    and (select count(*) from public.conversation_participants where conversation_id=c.id)=2
  order by c.created_at,c.id limit 1;
  if chat_id is null then
    insert into public.conversations(type) values('dm') returning id into chat_id;
    insert into public.conversation_participants(conversation_id,user_id)
      values(chat_id,actor),(chat_id,target_user_id);
  end if;
  return chat_id;
end;
$$;

-- Remove permissive legacy policies, then replace them with one coherent set.
do $$
declare p record;
begin
  for p in select tablename,policyname from pg_policies where schemaname='public'
    and tablename in ('conversations','conversation_participants','messages','message_reactions')
  loop
    execute format('drop policy %I on public.%I',p.policyname,p.tablename);
  end loop;
end $$;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;

create policy chat_conversation_read on public.conversations for select to authenticated
  using(public.is_chat_participant(id));
create policy chat_conversation_update on public.conversations for update to authenticated
  using(public.is_chat_participant(id)) with check(public.is_chat_participant(id));
create policy chat_participant_read on public.conversation_participants for select to authenticated
  using(public.is_chat_participant(conversation_id));
create policy chat_participant_update on public.conversation_participants for update to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy chat_message_read on public.messages for select to authenticated
  using(public.is_chat_participant(conversation_id));
create policy chat_message_insert on public.messages for insert to authenticated
  with check(sender_id=auth.uid() and public.can_send_to_chat(conversation_id)
    and type in ('text','prayer_share')
    and length(content)<=20000 and (length(content)>0 or image_path is not null or image_url is not null
      or (type='prayer_share' and length(prayer_request_content)>0))
    and not deleted_for_everyone and not deleted_for_sender and not is_edited);
create policy chat_message_update on public.messages for update to authenticated
  using(sender_id=auth.uid() and public.is_chat_participant(conversation_id))
  with check(sender_id=auth.uid() and public.is_chat_participant(conversation_id));
create policy chat_reaction_read on public.message_reactions for select to authenticated
  using(exists(select 1 from public.messages m where m.id=message_id
    and public.is_chat_participant(m.conversation_id)));
create policy chat_reaction_insert on public.message_reactions for insert to authenticated
  with check(user_id=auth.uid() and reaction_type in ('pray','amen','support') and
    exists(select 1 from public.messages m where m.id=message_id
      and not m.deleted_for_everyone and public.can_send_to_chat(m.conversation_id)));
create policy chat_reaction_update on public.message_reactions for update to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid() and reaction_type in ('pray','amen','support')
    and exists(select 1 from public.messages m where m.id=message_id
      and not m.deleted_for_everyone and public.can_send_to_chat(m.conversation_id)));
create policy chat_reaction_delete on public.message_reactions for delete to authenticated
  using(user_id=auth.uid());

-- Immutable message/participant identity columns must not be editable.
revoke all on public.conversations, public.conversation_participants,
  public.messages, public.message_reactions from public,anon,authenticated;
grant select on public.conversations, public.conversation_participants,
  public.messages, public.message_reactions to authenticated;
grant update(updated_at) on public.conversations to authenticated;
grant update(last_read_at,is_muted) on public.conversation_participants to authenticated;
grant insert(conversation_id,sender_id,content,type,prayer_request_content,image_url,
  image_path,reply_to,is_edited,deleted_for_everyone,deleted_for_sender)
  on public.messages to authenticated;
grant update(content,is_edited,edited_at,deleted_for_everyone,deleted_for_sender)
  on public.messages to authenticated;
grant insert(message_id,user_id,reaction_type),update(reaction_type),delete
  on public.message_reactions to authenticated;
grant all on public.conversations,public.conversation_participants,
  public.messages,public.message_reactions to service_role;

create or replace function public.guard_chat_message_edit()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if auth.role()='authenticated' then
    if (new.content is distinct from old.content or
        new.deleted_for_everyone is distinct from old.deleted_for_everyone)
      and (old.created_at is null or old.created_at < now()-interval '15 minutes') then
      raise exception 'The edit/delete time window has expired' using errcode='42501';
    end if;
    if old.deleted_for_everyone and not new.deleted_for_everyone then
      raise exception 'Deleted messages cannot be restored' using errcode='42501';
    end if;
    if length(new.content)>20000 or
      (length(new.content)=0 and new.image_path is null and new.image_url is null
       and not (new.type='prayer_share' and coalesce(length(new.prayer_request_content),0)>0)) then
      raise exception 'Message text is required and must be within 20000 characters';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_chat_message_edit on public.messages;
create trigger guard_chat_message_edit before update on public.messages
  for each row execute function public.guard_chat_message_edit();

revoke all on function public.is_chat_participant(uuid),public.can_send_to_chat(uuid),
  public.get_or_create_dm(uuid),public.guard_chat_message_edit() from public,anon;
grant execute on function public.is_chat_participant(uuid),public.can_send_to_chat(uuid),
  public.get_or_create_dm(uuid) to authenticated;

do $$
declare t text;
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach t in array array['messages','message_reactions'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
        and schemaname='public' and tablename=t) then
        execute format('alter publication supabase_realtime add table public.%I',t);
      end if;
    end loop;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
