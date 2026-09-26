-- Apply in the SQL Editor of the confirmed development Supabase project.
-- The existing deployment has some friendship RPCs but is missing these two.
-- This patch creates only the missing RPCs; it does not change RLS or data.
begin;

create or replace function public.cancel_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  delete from public.friend_requests
   where id = request_id
     and sender_id = auth.uid()
     and status = 'pending'
  returning id into deleted_request_id;
  if deleted_request_id is null then
    raise exception 'Friend request is no longer pending' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.unblock_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  delete from public.blocked_users
   where blocker_id = auth.uid()
     and blocked_id = target_user_id;
end;
$$;

revoke all on function public.cancel_friend_request(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

commit;
notify pgrst, 'reload schema';