-- Apply after 20260827_friends_connections_security.sql.
-- Notifications are secondary: an error creating one must never roll back
-- an otherwise valid friend request or response.
begin;

create or replace function public.create_friend_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op = 'INSERT' and new.status = 'pending' then
      insert into public.notifications (recipient_id, actor_id, type, request_id)
      values (new.receiver_id, new.sender_id, 'friend_request', new.id)
      on conflict do nothing;
    elsif tg_op = 'UPDATE'
      and new.status = 'pending'
      and old.status is distinct from 'pending' then
      insert into public.notifications (recipient_id, actor_id, type, request_id)
      values (new.receiver_id, new.sender_id, 'friend_request', new.id)
      on conflict do nothing;
    elsif tg_op = 'UPDATE' and old.status = 'pending' then
      delete from public.notifications
      where request_id = new.id and type = 'friend_request';
      if new.status = 'accepted' then
        insert into public.notifications (recipient_id, actor_id, type, request_id)
        values (new.sender_id, new.receiver_id, 'friend_request_accepted', new.id)
        on conflict do nothing;
      end if;
    end if;
  exception when others then
    raise warning 'Friend notification update failed (SQLSTATE %)', sqlstate;
  end;
  return new;
end;
$$;

commit;
notify pgrst, 'reload schema';