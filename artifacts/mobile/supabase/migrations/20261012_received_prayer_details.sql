begin;

-- Invoker rights retain the parent request's RLS. The explicit block predicate
-- also protects installations whose older public/friends policies omit it.
create or replace function public.get_received_prayer_details(prayer_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'id',r.id,
    'senderId',case when r.is_anonymous then '' else r.author_id::text end,
    'senderName',case when r.is_anonymous then 'Anonymous' else coalesce(nullif(trim(p.full_name),''),'Someone') end,
    'senderAvatar',case when r.is_anonymous then '' else coalesce(p.avatar_url,'') end,
    'type','text','content',r.content,'sentAt',r.created_at,
    'prayerCount',(select count(*) from public.prayer_engagements e where e.request_id=r.id),
    'hasPrayed',exists(select 1 from public.prayer_engagements e where e.request_id=r.id and e.user_id=auth.uid()),
    'prayedByAvatars','[]'::jsonb,
    'eventDate',r.event_date,'eventTime',r.event_time,'hasPrayerDate',coalesce(r.has_prayer_date,false),
    'status',r.status,'imageUrl',r.image_url,
    'updates',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'content',u.content,'createdAt',u.created_at)
      order by u.created_at,u.id) from public.prayer_request_updates u
      where u.request_id=r.id and u.author_id=r.author_id),'[]'::jsonb)
  )
  from public.prayer_requests r
  left join public.profiles p on not coalesce(r.is_anonymous,false) and p.id=r.author_id
  where auth.uid() is not null and r.id=prayer_id
    and not public.is_blocked_between(auth.uid(),r.author_id);
$$;
revoke all on function public.get_received_prayer_details(uuid) from public, anon;
grant execute on function public.get_received_prayer_details(uuid) to authenticated;

-- The home inbox shows actual requests from accepted friends, not a public
-- directory or sample activity. The detail RPC remains the visibility authority.
create or replace function public.get_received_prayers()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(details order by created_at desc,id),'[]'::jsonb)
  from (
    select r.id,r.created_at,public.get_received_prayer_details(r.id) as details
    from public.prayer_requests r
    where auth.uid() is not null and r.author_id<>auth.uid() and r.status<>'archived'
      and not public.is_blocked_between(auth.uid(),r.author_id)
      and exists(select 1 from public.friend_requests f where f.status='accepted'
        and ((f.sender_id=auth.uid() and f.receiver_id=r.author_id)
          or (f.receiver_id=auth.uid() and f.sender_id=r.author_id)))
    order by r.created_at desc,r.id limit 50
  ) requests where details is not null;
$$;
revoke all on function public.get_received_prayers() from public, anon;
grant execute on function public.get_received_prayers() to authenticated;

-- Definer rights are needed for the existing prayer-count trigger to update
-- another author's row. Never trust a client-supplied engagement owner.
create or replace function public.pray_for_received_request(p_expected_user_id uuid,prayer_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare caller uuid:=auth.uid(); r public.prayer_requests;
begin
  if caller is null or caller is distinct from p_expected_user_id then raise exception 'Account changed'; end if;
  select * into r from public.prayer_requests where id=prayer_id for update;
  if not found then raise exception 'Prayer request unavailable'; end if;
  if public.is_blocked_between(caller,r.author_id) or not (
    r.author_id=caller or (
      r.status<>'archived' and (
        r.audience='everyone' or (r.audience='friends' and exists(
          select 1 from public.friend_requests f where f.status='accepted'
          and ((f.sender_id=caller and f.receiver_id=r.author_id)
            or (f.receiver_id=caller and f.sender_id=r.author_id))))
      )
    )
  ) then raise exception 'Prayer request unavailable'; end if;
  if exists(select 1 from public.account_deletion_jobs where user_id=caller)
    then raise exception 'Account deletion in progress'; end if;
  insert into public.prayer_engagements(request_id,user_id) values(r.id,caller)
    on conflict(request_id,user_id) do nothing;
  return jsonb_build_object('hasPrayed',true,'prayerCount',
    (select count(*) from public.prayer_engagements e where e.request_id=r.id));
end $$;
revoke all on function public.pray_for_received_request(uuid,uuid) from public,anon;
grant execute on function public.pray_for_received_request(uuid,uuid) to authenticated;
commit;
