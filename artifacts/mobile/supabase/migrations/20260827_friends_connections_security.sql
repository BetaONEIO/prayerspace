  -- Prayer Space friends/connections security migration
  --
  -- Apply this in the Supabase SQL editor after reviewing the duplicate-pair
  -- check below. The app must use the RPCs in this file for relationship
  -- mutations; direct table writes are intentionally not granted.
  --
  -- This migration is deliberately fail-safe: if the existing database contains
  -- more than one active relationship row for an unordered pair, it stops
  -- instead of deleting relationship history automatically.

  begin;

  do $$
  begin
    if not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.friend_requests'::regclass
        and conname = 'friend_requests_no_self_request'
    ) then
      alter table public.friend_requests
        add constraint friend_requests_no_self_request
        check (sender_id <> receiver_id);
    end if;
  end
  $$;

  do $$
  begin
    if exists (
      select 1
      from public.friend_requests
      where status in ('pending', 'accepted')
      group by least(sender_id, receiver_id), greatest(sender_id, receiver_id)
      having count(*) > 1
    ) then
      raise exception
        'friend_requests contains duplicate active relationships; resolve them before applying this migration';
    end if;
  end
  $$;

  create unique index if not exists friend_requests_one_active_pair
    on public.friend_requests (
      least(sender_id, receiver_id),
      greatest(sender_id, receiver_id)
    )
    where status in ('pending', 'accepted');

  create index if not exists friend_requests_sender_receiver_status_idx
    on public.friend_requests (sender_id, receiver_id, status);

  create index if not exists friend_requests_receiver_sender_status_idx
    on public.friend_requests (receiver_id, sender_id, status);

  create or replace function public.is_blocked_between(
    first_user_id uuid,
    second_user_id uuid
  )
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1
      from public.blocked_users
      where (blocker_id = first_user_id and blocked_id = second_user_id)
         or (blocker_id = second_user_id and blocked_id = first_user_id)
    );
  $$;

  create or replace function public.send_friend_request(target_user_id uuid)
  returns public.friend_requests
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    current_user_id uuid := auth.uid();
    existing_request public.friend_requests;
    result_request public.friend_requests;
  begin
    if current_user_id is null then
      raise exception 'Authentication required' using errcode = '42501';
    end if;
    if target_user_id is null or target_user_id = current_user_id then
      raise exception 'You cannot send a friend request to yourself' using errcode = '22023';
    end if;
    if not exists (select 1 from auth.users where id = target_user_id) then
      raise exception 'The requested user does not exist' using errcode = '23503';
    end if;
    if public.is_blocked_between(current_user_id, target_user_id) then
      raise exception 'Friend requests are unavailable for this user' using errcode = '42501';
    end if;

    select *
      into existing_request
      from public.friend_requests
     where (sender_id = current_user_id and receiver_id = target_user_id)
        or (sender_id = target_user_id and receiver_id = current_user_id)
     order by case status when 'accepted' then 0 when 'pending' then 1 else 2 end,
              created_at desc
     limit 1
     for update;

    if existing_request.status = 'accepted' then
      raise exception 'You are already friends with this person' using errcode = '23505';
    end if;
    if existing_request.status = 'pending' then
      raise exception 'A friend request is already pending' using errcode = '23505';
    end if;

    if existing_request.id is not null then
      update public.friend_requests
         set sender_id = current_user_id,
             receiver_id = target_user_id,
             status = 'pending',
             created_at = now()
       where id = existing_request.id
       returning * into result_request;
    else
      insert into public.friend_requests (sender_id, receiver_id, status)
      values (current_user_id, target_user_id, 'pending')
      returning * into result_request;
    end if;

    return result_request;
  end;
  $$;

  create or replace function public.respond_to_friend_request(
    request_id uuid,
    next_status text
  )
  returns public.friend_requests
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    request_sender_id uuid;
    result_request public.friend_requests;
  begin
    if auth.uid() is null then
      raise exception 'Authentication required' using errcode = '42501';
    end if;
    if next_status not in ('accepted', 'declined') then
      raise exception 'Invalid friend request status' using errcode = '22023';
    end if;

    select sender_id
      into request_sender_id
      from public.friend_requests
     where id = request_id
       and receiver_id = auth.uid()
       and status = 'pending'
     for update;

    if request_sender_id is null then
      raise exception 'Friend request is no longer pending' using errcode = 'P0002';
    end if;
    if public.is_blocked_between(auth.uid(), request_sender_id) then
      raise exception 'Friend requests are unavailable for this user' using errcode = '42501';
    end if;

    update public.friend_requests
       set status = next_status
     where id = request_id
       and receiver_id = auth.uid()
       and status = 'pending'
     returning * into result_request;

    if result_request.id is null then
      raise exception 'Friend request is no longer pending' using errcode = 'P0002';
    end if;
    return result_request;
  end;
  $$;

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

  create or replace function public.remove_friend(target_user_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if auth.uid() is null then
      raise exception 'Authentication required' using errcode = '42501';
    end if;
    if target_user_id is null or target_user_id = auth.uid() then
      raise exception 'Invalid friend target' using errcode = '22023';
    end if;
    delete from public.friend_requests
     where status = 'accepted'
       and (
         (sender_id = auth.uid() and receiver_id = target_user_id)
         or (sender_id = target_user_id and receiver_id = auth.uid())
       );
  end;
  $$;

  create or replace function public.block_user(target_user_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if auth.uid() is null then
      raise exception 'Authentication required' using errcode = '42501';
    end if;
    if target_user_id is null or target_user_id = auth.uid() then
      raise exception 'Invalid block target' using errcode = '22023';
    end if;
    if not exists (select 1 from auth.users where id = target_user_id) then
      raise exception 'The requested user does not exist' using errcode = '23503';
    end if;

    insert into public.blocked_users (blocker_id, blocked_id)
    values (auth.uid(), target_user_id)
    on conflict do nothing;

    delete from public.friend_requests
     where (sender_id = auth.uid() and receiver_id = target_user_id)
        or (sender_id = target_user_id and receiver_id = auth.uid());
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

  revoke all on function public.send_friend_request(uuid) from public, anon;
  revoke all on function public.respond_to_friend_request(uuid, text) from public, anon;
  revoke all on function public.cancel_friend_request(uuid) from public, anon;
  revoke all on function public.remove_friend(uuid) from public, anon;
  revoke all on function public.block_user(uuid) from public, anon;
  revoke all on function public.unblock_user(uuid) from public, anon;
  grant execute on function public.send_friend_request(uuid) to authenticated;
  grant execute on function public.respond_to_friend_request(uuid, text) to authenticated;
  grant execute on function public.cancel_friend_request(uuid) to authenticated;
  grant execute on function public.remove_friend(uuid) to authenticated;
  grant execute on function public.block_user(uuid) to authenticated;
  grant execute on function public.unblock_user(uuid) to authenticated;

  alter table public.friend_requests enable row level security;
  drop policy if exists "Users can read own requests" on public.friend_requests;
  drop policy if exists "Authenticated users can send requests" on public.friend_requests;
  drop policy if exists "Receivers can update status" on public.friend_requests;
  drop policy if exists "Users can delete own sent requests" on public.friend_requests;

  create policy "Users can read own friend requests"
    on public.friend_requests for select
    using (auth.uid() = sender_id or auth.uid() = receiver_id);

  -- Relationship mutations go through the security-definer RPCs above.
  drop policy if exists "Users can delete own pending requests" on public.friend_requests;
  revoke insert, update, delete on table public.friend_requests from anon, authenticated;

  alter table public.blocked_users enable row level security;
  drop policy if exists "Users manage own blocks" on public.blocked_users;
  drop policy if exists "Users can create their own blocks" on public.blocked_users;
  drop policy if exists "Users can remove their own blocks" on public.blocked_users;
  create policy "Users can read blocks involving them"
    on public.blocked_users for select
    using (auth.uid() = blocker_id or auth.uid() = blocked_id);
  revoke insert, update, delete on table public.blocked_users from anon, authenticated;

  -- Durable friend-request notifications.
  create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references auth.users(id) on delete cascade,
    actor_id uuid references auth.users(id) on delete set null,
    type text not null check (type in ('friend_request', 'friend_request_accepted')),
    request_id uuid references public.friend_requests(id) on delete cascade,
    read_at timestamptz,
    created_at timestamptz not null default now(),
    unique (recipient_id, actor_id, type, request_id)
  );

  alter table public.notifications enable row level security;
  drop policy if exists "Users can read own notifications" on public.notifications;
  drop policy if exists "Users can mark own notifications read" on public.notifications;
  create policy "Users can read own notifications"
    on public.notifications for select
    using (
      auth.uid() = recipient_id
      and (actor_id is null or not public.is_blocked_between(recipient_id, actor_id))
    );
  create policy "Users can mark own notifications read"
    on public.notifications for update
    using (auth.uid() = recipient_id)
    with check (auth.uid() = recipient_id);
  create policy "Users can dismiss own notifications"
    on public.notifications for delete
    using (auth.uid() = recipient_id);

  do $$
  begin
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end
  $$;

  create or replace function public.create_friend_notification()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
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
       where request_id = new.id
         and type = 'friend_request';
      if new.status = 'accepted' then
        insert into public.notifications (recipient_id, actor_id, type, request_id)
        values (new.sender_id, new.receiver_id, 'friend_request_accepted', new.id)
        on conflict do nothing;
      end if;
    end if;
    return new;
  end;
  $$;

  drop trigger if exists friend_request_notification_trigger on public.friend_requests;
  create trigger friend_request_notification_trigger
    after insert or update of status on public.friend_requests
    for each row execute function public.create_friend_notification();

  -- Correct server-side visibility for public, friends-only, and private prayers.
  alter table public.prayer_requests enable row level security;
  drop policy if exists "Anyone can view public prayer requests" on public.prayer_requests;
  drop policy if exists "Public posts visible to all" on public.prayer_requests;
  drop policy if exists "Friends can read friends posts" on public.prayer_requests;
  drop policy if exists "Authors can view own private prayer requests" on public.prayer_requests;

  create policy "Public prayer requests are visible"
    on public.prayer_requests for select
    using (
      audience = 'everyone'
      and status <> 'archived'
      and not public.is_blocked_between(auth.uid(), author_id)
    );
  create policy "Friends can read friends prayer requests"
    on public.prayer_requests for select
    using (
      audience = 'friends'
      and status <> 'archived'
      and not public.is_blocked_between(auth.uid(), author_id)
      and (
        author_id = auth.uid()
        or exists (
          select 1
          from public.friend_requests fr
          where fr.status = 'accepted'
            and (
              (fr.sender_id = auth.uid() and fr.receiver_id = prayer_requests.author_id)
              or (fr.receiver_id = auth.uid() and fr.sender_id = prayer_requests.author_id)
            )
          )
        )
    );
  create policy "Authors can read private prayer requests"
    on public.prayer_requests for select
    using (audience = 'private' and auth.uid() = author_id);

  -- Ensure accepted friends can read follow-up updates only when the parent
  -- prayer is visible to them.
  drop policy if exists "Anyone can view updates on visible requests" on public.prayer_request_updates;
  create policy "Users can view updates on visible requests"
    on public.prayer_request_updates for select
    using (
      exists (
        select 1
        from public.prayer_requests pr
        where pr.id = request_id
          and (
            (
              pr.audience = 'everyone'
              and pr.status <> 'archived'
              and not public.is_blocked_between(auth.uid(), pr.author_id)
            )
            or (pr.audience = 'private' and pr.author_id = auth.uid())
            or (
              pr.audience = 'friends'
              and pr.status <> 'archived'
              and not public.is_blocked_between(auth.uid(), pr.author_id)
              and (
                pr.author_id = auth.uid()
                or exists (
                  select 1
                  from public.friend_requests fr
                  where fr.status = 'accepted'
                    and (
                      (fr.sender_id = auth.uid() and fr.receiver_id = pr.author_id)
                      or (fr.receiver_id = auth.uid() and fr.sender_id = pr.author_id)
                    )
                  )
                )
              )
          )
      )
    );

  do $$
  begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'friend_requests'
      ) then
      alter publication supabase_realtime add table public.friend_requests;
    end if;
  end
  $$;

  commit;

  -- Refresh PostgREST's function cache immediately in projects where the SQL
  -- editor does not trigger an automatic schema reload.
  notify pgrst, 'reload schema';