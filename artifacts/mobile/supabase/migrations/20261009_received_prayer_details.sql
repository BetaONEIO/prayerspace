begin;
create or replace function public.get_received_prayer_details(prayer_id uuid)
returns jsonb language sql stable security invoker set search_path=''
as $$
  select jsonb_build_object(
    'id',r.id, 'senderId',case when r.is_anonymous then '' else r.author_id::text end,
    'senderName',case when r.is_anonymous then 'Anonymous' else coalesce(p.full_name,'Someone') end,
    'senderAvatar',case when r.is_anonymous then '' else coalesce(p.avatar_url,'') end,
    'type','text','content',r.content,'sentAt',r.created_at,
    'prayerCount',coalesce(r.prayer_count,0),'prayedByAvatars','[]'::jsonb,
    'eventDate',r.event_date,'eventTime',r.event_time,'hasPrayerDate',r.has_prayer_date
  )
  from public.prayer_requests r
  left join public.profiles p on not coalesce(r.is_anonymous,false) and p.id=r.author_id
  where auth.uid() is not null and r.id=prayer_id;
$$;
revoke all on function public.get_received_prayer_details(uuid) from public,anon;
grant execute on function public.get_received_prayer_details(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
