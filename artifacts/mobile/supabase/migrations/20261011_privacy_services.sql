begin;

create table public.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.moderators enable row level security;
revoke all on public.moderators from anon, authenticated;
grant select on public.moderators to authenticated;
grant all on public.moderators to service_role;
create policy moderator_self_read on public.moderators for select to authenticated using (user_id = auth.uid());

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete set null,
  target_kind text not null check (target_kind in ('post','user','conversation','message')),
  target_id uuid,
  reason text not null check (length(reason) between 1 and 4000),
  snapshot jsonb not null default '{}',
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
alter table public.moderation_reports enable row level security;
revoke all on public.moderation_reports from anon, authenticated;
grant all on public.moderation_reports to service_role;
create index moderation_queue_idx on public.moderation_reports(status, created_at);
create index moderation_reporter_idx on public.moderation_reports(reporter_id, created_at);

create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.moderators where user_id = auth.uid()) $$;
revoke all on function public.is_moderator() from public;
grant execute on function public.is_moderator() to authenticated;

-- Definer access explicitly mirrors the caller's content visibility.
create or replace function public.submit_abuse_report(
  p_expected_user_id uuid, p_kind text, p_target_id uuid, p_reason text
) returns uuid language plpgsql security definer set search_path = public
as $$
declare u uuid := auth.uid(); subject uuid; captured jsonb; existing uuid;
begin
  if u is null or u is distinct from p_expected_user_id then raise exception 'Account changed'; end if;
  if p_reason is null or length(trim(p_reason)) not between 1 and 4000 then raise exception 'A report reason is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 17));
  select id into existing from moderation_reports where reporter_id=u and target_kind=p_kind
    and target_id=p_target_id and reason=trim(p_reason) and status='open' limit 1;
  if existing is not null then return existing; end if;
  if (select count(*) from moderation_reports where reporter_id=u and created_at>now()-interval '1 hour') >= 20
    then raise exception 'Report limit reached. Please try again later.'; end if;
  if p_kind='post' then
    select author_id, jsonb_build_object('content',left(content,4000),'anonymous',is_anonymous)
      into subject,captured from prayer_requests pr where id=p_target_id and (
        author_id=u or (audience='everyone' and status<>'archived') or
        (audience='friends' and status<>'archived' and exists(select 1 from friend_requests fr where
          fr.status='accepted' and ((fr.sender_id=u and fr.receiver_id=pr.author_id) or
            (fr.receiver_id=u and fr.sender_id=pr.author_id)))));
  elsif p_kind='user' then
    select id,jsonb_build_object('name',full_name) into subject,captured from profiles where id=p_target_id;
  elsif p_kind='message' then
    select sender_id,jsonb_build_object('content',left(content,4000),'conversationId',conversation_id)
      into subject,captured from messages m where id=p_target_id and exists(
        select 1 from conversation_participants cp where cp.conversation_id=m.conversation_id and cp.user_id=u);
  elsif p_kind='conversation' then
    select jsonb_build_object('name',name,'type',type) into captured from conversations c where id=p_target_id
      and exists(select 1 from conversation_participants cp where cp.conversation_id=c.id and cp.user_id=u);
  else raise exception 'Unsupported report type';
  end if;
  if captured is null then raise exception 'This content is unavailable or you do not have access to it'; end if;
  insert into moderation_reports(reporter_id,subject_user_id,target_kind,target_id,reason,snapshot)
    values(u,subject,p_kind,p_target_id,trim(p_reason),captured) returning id into existing;
  return existing;
end $$;
revoke all on function public.submit_abuse_report(uuid,text,uuid,text) from public;
grant execute on function public.submit_abuse_report(uuid,text,uuid,text) to authenticated;

create or replace function public.get_moderation_queue() returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'Moderator access required'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r)) from
    (select * from moderation_reports where status='open' order by created_at limit 100) r),'[]'::jsonb);
end $$;
revoke all on function public.get_moderation_queue() from public;
grant execute on function public.get_moderation_queue() to authenticated;

create or replace function public.review_abuse_report(p_expected_user_id uuid,p_report_id uuid,p_status text,p_remove_content boolean default false)
returns void language plpgsql security definer set search_path = public
as $$
declare r moderation_reports;
begin
  if not public.is_moderator() then raise exception 'Moderator access required'; end if;
  if auth.uid() is distinct from p_expected_user_id then raise exception 'Account changed'; end if;
  if p_status not in ('resolved','dismissed') then raise exception 'Invalid review status'; end if;
  select * into r from moderation_reports where id=p_report_id for update;
  if not found then raise exception 'Report not found'; end if;
  if p_remove_content then
    if p_status<>'resolved' then raise exception 'Removal requires a resolved report'; end if;
    if r.target_kind='post' then delete from prayer_requests where id=r.target_id;
    elsif r.target_kind='message' then
      update messages set reply_to=null where reply_to->>'id'=r.target_id::text;
      delete from messages where id=r.target_id;
    else raise exception 'Only posts and messages can be removed here'; end if;
  end if;
  update moderation_reports set status=p_status,reviewed_at=now(),reviewed_by=auth.uid() where id=r.id;
end $$;
revoke all on function public.review_abuse_report(uuid,uuid,text,boolean) from public;
grant execute on function public.review_abuse_report(uuid,uuid,text,boolean) to authenticated;

create table public.private_journal_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check(length(id) between 1 and 200),
  entry jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key(user_id,id)
);
alter table public.private_journal_entries enable row level security;
revoke all on public.private_journal_entries from anon,authenticated;
grant all on public.private_journal_entries to service_role;

create or replace function public.sync_private_journal(p_expected_user_id uuid,p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare u uuid:=auth.uid(); change jsonb; old private_journal_entries; doc jsonb; conflicts jsonb:='[]';
begin
  if u is null or u is distinct from p_expected_user_id then raise exception 'Account changed'; end if;
  if exists(select 1 from account_deletion_jobs where user_id=u) then raise exception 'Account deletion is in progress'; end if;
  if p_changes is null or jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes)>5000
    or octet_length(p_changes::text)>5242880 then raise exception 'Journal backup is too large'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 18));
  for change in select value from jsonb_array_elements(p_changes) loop
    if length(change->>'id') not between 1 and 200 or coalesce(change->>'expectedRevision','')!~'^[0-9]+$'
      then raise exception 'Invalid journal change'; end if;
    doc:=change->'entry';
    if doc='null'::jsonb then doc:=null; end if;
    if doc is not null and (
      jsonb_typeof(doc)<>'object' or doc->>'id' is distinct from change->>'id'
      or jsonb_typeof(doc->'title') is distinct from 'string'
      or jsonb_typeof(doc->'body') is distinct from 'string'
      or length(doc->>'title')>1000 or length(doc->>'body')>100000
      or coalesce(doc->>'tag','') not in ('gratitude','petition','reflection','praying_for')
      or jsonb_typeof(doc->'timestamp') is distinct from 'number'
      or jsonb_typeof(doc->'isFavorite') is distinct from 'boolean'
      or jsonb_typeof(doc->'isAnswered') is distinct from 'boolean'
    ) then raise exception 'Invalid journal entry'; end if;
    select * into old from private_journal_entries where user_id=u and id=change->>'id' for update;
    if not found then
      if (change->>'expectedRevision')::bigint<>0 then conflicts:=conflicts||jsonb_build_array(change->>'id');
      else
        if (select count(*) from private_journal_entries where user_id=u)>=5000 then raise exception 'Journal backup limit reached'; end if;
        insert into private_journal_entries(user_id,id,entry) values(u,change->>'id',doc);
      end if;
    elsif old.entry is not distinct from doc then
      null; -- Idempotent retries acknowledge identical content without bumping revision.
    elsif old.revision<>(change->>'expectedRevision')::bigint then
      conflicts:=conflicts||jsonb_build_array(change->>'id');
    else
      update private_journal_entries set entry=doc,revision=revision+1,updated_at=now()
        where user_id=u and id=change->>'id';
    end if;
  end loop;
  if (select coalesce(sum(octet_length(entry::text)),0) from private_journal_entries where user_id=u)>5242880
    then raise exception 'Journal cloud storage limit reached (5 MB). Device edits are retained.'; end if;
  return jsonb_build_object('conflicts',conflicts,'entries',coalesce((select jsonb_agg(
    jsonb_build_object('id',id,'entry',entry,'revision',revision)) from private_journal_entries where user_id=u),'[]'::jsonb));
end $$;
revoke all on function public.sync_private_journal(uuid,jsonb) from public;
grant execute on function public.sync_private_journal(uuid,jsonb) to authenticated;

create table public.account_deletion_jobs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from anon,authenticated;
grant all on public.account_deletion_jobs to service_role;

create or replace function public.request_own_account_deletion(p_expected_user_id uuid) returns void
language plpgsql security definer set search_path = public
as $$
declare u uuid:=auth.uid(); recent timestamptz;
begin
  if u is null or u is distinct from p_expected_user_id then raise exception 'Account changed'; end if;
  select last_sign_in_at into recent from auth.users where id=u;
  if recent is null or recent < now()-interval '15 minutes' then
    raise exception 'Sign out and sign back in before confirming deletion'; end if;
  insert into account_deletion_jobs(user_id) values(u) on conflict(user_id) do nothing;
  update profiles set deletion_requested_at=now() where id=u;
end $$;
revoke all on function public.request_own_account_deletion(uuid) from public;
grant execute on function public.request_own_account_deletion(uuid) to authenticated;

create or replace function public.claim_account_deletions() returns setof public.account_deletion_jobs
language sql security definer set search_path = public
as $$
  update account_deletion_jobs set next_attempt_at=now()+interval '5 minutes',attempts=attempts+1
  where user_id in (select user_id from account_deletion_jobs where next_attempt_at<=now()
    order by requested_at limit 5 for update skip locked) returning *
$$;
revoke all on function public.claim_account_deletions() from public;
grant execute on function public.claim_account_deletions() to service_role;

create or replace function public.deletion_owned_files(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not exists(select 1 from account_deletion_jobs where user_id=p_user_id) then raise exception 'No authorized deletion job'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('bucket',bucket_id,'name',name)) from storage.objects
    where owner_id=p_user_id::text or owner=p_user_id),'[]'::jsonb);
end $$;
revoke all on function public.deletion_owned_files(uuid) from public;
grant execute on function public.deletion_owned_files(uuid) to service_role;

create or replace function public.prepare_account_deletion(p_user_id uuid) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists(select 1 from account_deletion_jobs where user_id=p_user_id) then raise exception 'No authorized deletion job'; end if;
  if exists(select 1 from storage.objects where owner_id=p_user_id::text or owner=p_user_id)
    then raise exception 'Owned files still need removal'; end if;
  update messages set reply_to=null where reply_to->>'id' in (select id::text from messages where sender_id=p_user_id);
  delete from moderation_reports where subject_user_id=p_user_id or reporter_id=p_user_id;
  delete from messages where sender_id=p_user_id;
  delete from email_otps where email in (select email from auth.users where id=p_user_id);
  delete from otp_codes where email in (select email from auth.users where id=p_user_id);
  -- Remaining account records have verified auth.users ON DELETE CASCADE FKs.
  -- Shared communities stay available; their owner_id becomes null.
end $$;
revoke all on function public.prepare_account_deletion(uuid) from public;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

create or replace function public.export_own_account_data(p_expected_user_id uuid) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if u is null or u is distinct from p_expected_user_id then raise exception 'Account changed'; end if;
  result:=jsonb_build_object(
    'account',(select jsonb_build_object('id',id,'email',email,'createdAt',created_at) from auth.users where id=u),
    'profile',(select to_jsonb(p) from profiles p where id=u),
    'prayerStats',(select to_jsonb(s) from prayer_stats s where user_id=u),
    'notificationPreferences',(select to_jsonb(n) from notification_preferences n where user_id=u),
    'prayerRequests',coalesce((select jsonb_agg(to_jsonb(r)) from prayer_requests r where author_id=u),'[]'),
    'prayerUpdates',coalesce((select jsonb_agg(to_jsonb(r)) from prayer_request_updates r where author_id=u),'[]'),
    'prayerEngagements',coalesce((select jsonb_agg(to_jsonb(r)) from prayer_engagements r where user_id=u),'[]'),
    'friendRequests',coalesce((select jsonb_agg(to_jsonb(r)) from friend_requests r where sender_id=u or receiver_id=u),'[]'),
    'memberships',coalesce((select jsonb_agg(to_jsonb(r)) from community_members r where user_id=u),'[]'),
    'ownedCommunities',coalesce((select jsonb_agg(to_jsonb(r)) from communities r where owner_id=u),'[]'),
    'conversationMemberships',coalesce((select jsonb_agg(to_jsonb(r)) from conversation_participants r where user_id=u),'[]'),
    'messages',coalesce((select jsonb_agg(to_jsonb(m)) from messages m where exists(
      select 1 from conversation_participants cp where cp.user_id=u and cp.conversation_id=m.conversation_id)),'[]'),
    'reactions',coalesce((select jsonb_agg(to_jsonb(r)) from message_reactions r where user_id=u),'[]'),
    'notifications',coalesce((select jsonb_agg(to_jsonb(r)) from notifications r where recipient_id=u),'[]'),
    'blockedUsers',coalesce((select jsonb_agg(to_jsonb(r)) from blocked_users r where blocker_id=u),'[]'),
    'tourProgress',(select to_jsonb(r) from user_tour_progress r where user_id=u),
    'journalCloud',coalesce((select jsonb_agg(to_jsonb(r)-'user_id') from private_journal_entries r where user_id=u),'[]'),
    'reports',coalesce((select jsonb_agg(jsonb_build_object('id',id,'targetKind',target_kind,
      'targetId',target_id,'reason',reason,'status',status,'createdAt',created_at)) from moderation_reports where reporter_id=u),'[]'),
    'storageFiles',coalesce((select jsonb_agg(jsonb_build_object('bucket',bucket_id,'name',name,'metadata',metadata))
      from storage.objects where owner_id=u::text or owner=u),'[]')
  );
  return result;
end $$;
revoke all on function public.export_own_account_data(uuid) from public;
grant execute on function public.export_own_account_data(uuid) to authenticated;

commit;
