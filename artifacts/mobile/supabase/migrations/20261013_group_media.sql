begin;
-- Clearing a deleted attachment must be allowed without weakening the
-- existing edit/delete window or permitting restoration of deleted messages.
create or replace function public.guard_chat_message_edit()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.role()='authenticated' then
    if (new.content is distinct from old.content or new.deleted_for_everyone is distinct from old.deleted_for_everyone)
      and (old.created_at is null or old.created_at<now()-interval '15 minutes')
      then raise exception 'The edit/delete time window has expired' using errcode='42501'; end if;
    if old.deleted_for_everyone and not new.deleted_for_everyone
      then raise exception 'Deleted messages cannot be restored' using errcode='42501'; end if;
    if not new.deleted_for_everyone and (length(new.content)>20000 or
      (length(new.content)=0 and new.image_path is null and new.image_url is null
        and not (new.type='prayer_share' and coalesce(length(new.prayer_request_content),0)>0)
        and not exists(select 1 from public.group_chat_media gm where gm.message_id=new.id
          and gm.group_id=new.conversation_id and gm.author_id=new.sender_id and gm.state='published' and gm.kind in ('image','voice'))))
      then raise exception 'Message text is required and must be within 20000 characters'; end if;
  end if;
  return new;
end $$;
create table if not exists public.group_chat_media (
  id uuid primary key,
  group_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('image','voice','cover')),
  mime text not null,
  bytes integer not null check(bytes between 1 and 8388608),
  digest text not null check(digest ~ '^[0-9a-f]{64}$'),
  duration_ms integer,
  path text not null unique,
  state text not null default 'pending' check(state in ('pending','uploaded','published')),
  message_id uuid unique references public.messages(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.group_chat_media enable row level security;
revoke all on public.group_chat_media from anon,authenticated;
-- Clients can upload only reserved files, but cannot read or sign storage URLs.
-- Downloads go through the authenticated API, which rechecks membership.
create or replace function public.group_media_upload_allowed(object_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.group_chat_media m
    join public.conversation_participants cp on cp.conversation_id=m.group_id and cp.user_id=auth.uid()
    where m.path=object_path and m.author_id=auth.uid() and m.state='pending'
      and (case when m.kind='cover' then cp.group_role='admin' else public.can_send_to_chat(m.group_id) end)
      and not exists(select 1 from public.account_deletion_jobs where user_id=auth.uid())
  );
$$;
revoke all on function public.group_media_upload_allowed(text) from public,anon;
grant execute on function public.group_media_upload_allowed(text) to authenticated;
drop policy if exists group_media_upload on storage.objects;
create policy group_media_upload on storage.objects for insert to authenticated
  with check(bucket_id='group-chat-private' and public.group_media_upload_allowed(name));
drop policy if exists group_media_no_direct_read on storage.objects;
create policy group_media_no_direct_read on storage.objects as restrictive for select to public
  using(bucket_id<>'group-chat-private');

create or replace function public.reserve_group_media(p_group_id uuid,p_expected_user_id uuid,p_media_id uuid,
  p_kind text,p_mime text,p_bytes integer,p_digest text,p_duration_ms integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.group_chat_media; ext text;
begin
  perform 1 from public.conversations where id=p_group_id for update;
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,p_kind<>'cover',p_kind='cover');
  if p_media_id is null or p_kind is null or p_kind not in ('image','voice','cover')
    or p_bytes is null or p_bytes not between 1 and 8388608
    or p_digest is null or p_digest !~ '^[0-9a-f]{64}$'
    or p_mime is null then raise exception 'Invalid media details'; end if;
  if p_kind in ('image','cover') and (p_bytes>5242880 or p_mime not in ('image/jpeg','image/png','image/webp'))
    then raise exception 'Choose a JPEG, PNG or WebP photo of at most 5 MB'; end if;
  if p_kind='voice' and (p_mime not in ('audio/mp4','audio/webm','audio/ogg','audio/wav','audio/aac','audio/3gpp','audio/x-caf')
    or p_duration_ms is null or p_duration_ms not between 1 and 300000)
    then raise exception 'Voice notes must be at most five minutes and 8 MB'; end if;
  ext := case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp'
    when 'audio/mp4' then 'm4a' when 'audio/webm' then 'webm' when 'audio/ogg' then 'ogg'
    when 'audio/wav' then 'wav' when 'audio/aac' then 'aac' when 'audio/3gpp' then '3gp' else 'caf' end;
  select * into m from public.group_chat_media where id=p_media_id;
  if found then
    if m.group_id<>p_group_id or m.author_id<>auth.uid() or m.kind<>p_kind or m.mime<>p_mime
      or m.bytes<>p_bytes or m.digest<>p_digest or m.duration_ms is distinct from p_duration_ms
      then raise exception 'Media identifier already belongs to a different upload'; end if;
  else
    insert into public.group_chat_media(id,group_id,author_id,kind,mime,bytes,digest,duration_ms,path)
      values(p_media_id,p_group_id,auth.uid(),p_kind,p_mime,p_bytes,p_digest,p_duration_ms,
        p_group_id::text||'/'||auth.uid()::text||'/'||p_media_id::text||'.'||ext) returning * into m;
  end if;
  return jsonb_build_object('id',m.id,'path',m.path,'mime',m.mime,'bytes',m.bytes,'digest',m.digest,'state',m.state);
end $$;

create or replace function public.commit_group_media_upload(p_group_id uuid,p_expected_user_id uuid,p_media_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare m public.group_chat_media;
begin
  select * into m from public.group_chat_media where id=p_media_id and group_id=p_group_id and author_id=auth.uid() for update;
  if not found then raise exception 'Upload unavailable'; end if;
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,m.kind<>'cover',m.kind='cover');
  if not exists(select 1 from storage.objects where bucket_id='group-chat-private' and name=m.path
    and (metadata->>'size')::bigint=m.bytes and metadata->>'mimetype'=m.mime)
    then raise exception 'File upload has not been verified'; end if;
  update public.group_chat_media set state=case when state='published' then state else 'uploaded' end where id=m.id;
  return m.id;
end $$;

create or replace function public.publish_group_media(p_group_id uuid,p_expected_user_id uuid,p_media_id uuid,
  p_client_id uuid,p_content text default '',p_reply_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare m public.group_chat_media; quoted jsonb; existing public.messages; fingerprint text;
begin
  perform 1 from public.conversations where id=p_group_id for update;
  select * into m from public.group_chat_media where id=p_media_id and group_id=p_group_id and author_id=auth.uid() for update;
  if not found or m.state='pending' then raise exception 'Upload unavailable'; end if;
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,m.kind<>'cover',m.kind='cover');
  if m.kind='cover' then
    if m.state='published' and (select group_settings->>'coverMediaId' from public.conversations where id=p_group_id) is distinct from m.id::text
      then raise exception 'This photo has been replaced'; end if;
    update public.conversations set group_settings=group_settings||jsonb_build_object('coverMediaId',m.id),updated_at=now() where id=p_group_id;
    update public.group_chat_media set state='published' where id=m.id;
    return m.id;
  end if;
  if p_client_id is null or p_content is null or length(p_content)>20000 then raise exception 'Invalid message'; end if;
  fingerprint := pg_catalog.md5(jsonb_build_object('media',m.id,'content',trim(p_content),'reply',p_reply_id)::text);
  select * into existing from public.messages where id=p_client_id;
  if found then
    if m.message_id=existing.id and existing.sender_id=auth.uid() and existing.conversation_id=p_group_id
      and existing.group_request_hash=fingerprint and not existing.deleted_for_everyone then return existing.id; end if;
    raise exception 'Message identifier unavailable';
  end if;
  if m.state='published' then raise exception 'This file already belongs to a message'; end if;
  if p_reply_id is not null then
    select jsonb_build_object('id',id,'content',content) into quoted from public.messages
      where id=p_reply_id and conversation_id=p_group_id and not deleted_for_everyone
        and not public.is_blocked_between(auth.uid(),sender_id)
        and (type<>'prayer_share' or public.group_prayer_is_visible(p_group_id,source_prayer_id));
    if quoted is null then raise exception 'Reply target unavailable'; end if;
  end if;
  insert into public.messages(id,conversation_id,sender_id,type,content,reply_to,group_request_hash)
    values(p_client_id,p_group_id,auth.uid(),'text',trim(p_content),quoted,fingerprint);
  update public.group_chat_media set state='published',message_id=p_client_id where id=m.id;
  update public.conversations set updated_at=now() where id=p_group_id;
  return p_client_id;
end $$;

create or replace function public.read_group_media(p_group_id uuid,p_expected_user_id uuid,p_media_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.group_chat_media;
begin
  perform public.require_group_chat_access(p_group_id,p_expected_user_id);
  select * into m from public.group_chat_media where id=p_media_id and group_id=p_group_id and state='published'
    and not public.is_blocked_between(auth.uid(),author_id);
  if not found or not (
    (m.kind='cover' and (select group_settings->>'coverMediaId' from public.conversations where id=p_group_id)=m.id::text)
    or (m.kind<>'cover' and exists(select 1 from public.messages where id=m.message_id
      and conversation_id=p_group_id and not deleted_for_everyone and not public.is_blocked_between(auth.uid(),sender_id)))
  ) then raise exception 'Media unavailable or access denied' using errcode='42501'; end if;
  return jsonb_build_object('id',m.id,'path',m.path,'mime',m.mime,'bytes',m.bytes,'digest',m.digest);
end $$;

create or replace function public.group_media_dto(media public.group_chat_media)
returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('id',media.id,'kind',media.kind,'mime',media.mime,'bytes',media.bytes,'durationMs',media.duration_ms);
$$;
revoke all on function public.group_media_dto(public.group_chat_media) from public,anon,authenticated;

-- Preserve the existing history/visibility implementation, adding media only
-- after that implementation has authorized and filtered each visible message.
do $$ begin
  if to_regprocedure('public.group_chat_history(uuid,uuid,uuid)') is null then
    alter function public.get_group_chat(uuid,uuid,uuid) rename to group_chat_history;
  end if;
end $$;
revoke all on function public.group_chat_history(uuid,uuid,uuid) from public,anon,authenticated;
create or replace function public.get_group_chat(p_group_id uuid,p_expected_user_id uuid,p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; items jsonb; cover jsonb;
begin
  result := public.group_chat_history(p_group_id,p_expected_user_id,p_before_id);
  select coalesce(jsonb_agg(item||jsonb_build_object('media',(
    select public.group_media_dto(m) from public.group_chat_media m
    where m.message_id=(item->>'id')::uuid and m.group_id=p_group_id and m.state='published'
      and not public.is_blocked_between(auth.uid(),m.author_id)
  )) order by position),'[]'::jsonb) into items
    from jsonb_array_elements(result->'messages') with ordinality as msg(item,position);
  select public.group_media_dto(m) into cover from public.group_chat_media m
    join public.conversations c on c.id=m.group_id
    where c.id=p_group_id and c.group_settings->>'coverMediaId'=m.id::text and m.state='published'
      and not public.is_blocked_between(auth.uid(),m.author_id);
  return result||jsonb_build_object('messages',items,'settings',(result->'settings')||jsonb_build_object('coverMedia',cover));
end $$;
revoke all on function public.reserve_group_media(uuid,uuid,uuid,text,text,integer,text,integer),
  public.commit_group_media_upload(uuid,uuid,uuid),public.publish_group_media(uuid,uuid,uuid,uuid,text,uuid),
  public.read_group_media(uuid,uuid,uuid),public.get_group_chat(uuid,uuid,uuid) from public,anon;
grant execute on function public.reserve_group_media(uuid,uuid,uuid,text,text,integer,text,integer),
  public.commit_group_media_upload(uuid,uuid,uuid),public.publish_group_media(uuid,uuid,uuid,uuid,text,uuid),
  public.read_group_media(uuid,uuid,uuid),public.get_group_chat(uuid,uuid,uuid) to authenticated;
commit;
