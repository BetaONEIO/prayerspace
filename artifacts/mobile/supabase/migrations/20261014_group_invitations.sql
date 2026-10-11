begin;
create table if not exists public.group_chat_invitations (
  id uuid primary key,
  group_id uuid not null references public.conversations(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','declined','revoked','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '7 days'),
  responded_at timestamptz,
  check(inviter_id<>recipient_id)
);
create unique index if not exists group_chat_one_pending_invite
  on public.group_chat_invitations(group_id,recipient_id) where status='pending';
create index if not exists group_chat_received_invites on public.group_chat_invitations(recipient_id,created_at desc);
alter table public.group_chat_invitations enable row level security;
revoke all on public.group_chat_invitations from anon,authenticated;
grant select on public.group_chat_invitations to authenticated;
drop policy if exists group_invitation_read on public.group_chat_invitations;
create policy group_invitation_read on public.group_chat_invitations for select to authenticated
  using(auth.uid() in (inviter_id,recipient_id));

create or replace function public.require_group_invitation_identity(u uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'authenticated' or auth.uid() is null or auth.uid() is distinct from u
    then raise exception 'Account changed or sign-in required' using errcode='42501'; end if;
  if exists(select 1 from public.account_deletion_jobs where user_id=u)
    then raise exception 'Account deletion in progress'; end if;
end $$;
revoke all on function public.require_group_invitation_identity(uuid) from public,anon,authenticated;

create or replace function public.group_invitation_is_eligible(g uuid,inviter uuid,recipient uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select inviter<>recipient
    and exists(select 1 from public.conversations where id=g and type='group')
    and exists(select 1 from public.conversation_participants where conversation_id=g and user_id=inviter and group_role='admin')
    and exists(select 1 from public.friend_requests where status='accepted' and
      ((sender_id=inviter and receiver_id=recipient) or (sender_id=recipient and receiver_id=inviter)))
    and not exists(select 1 from public.account_deletion_jobs where user_id in (inviter,recipient))
    and not public.is_blocked_between(inviter,recipient)
    and not exists(select 1 from public.conversation_participants where conversation_id=g
      and public.is_blocked_between(user_id,recipient));
$$;
revoke all on function public.group_invitation_is_eligible(uuid,uuid,uuid) from public,anon,authenticated;

create or replace function public.invite_group_chat_friend(p_group_id uuid,p_expected_user_id uuid,p_recipient_id uuid,p_client_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.group_chat_invitations;
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  perform 1 from public.conversations where id=p_group_id for update;
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,false,true);
  if p_client_id is null then raise exception 'Invitation identifier required'; end if;
  select * into existing from public.group_chat_invitations where id=p_client_id;
  if found then
    if existing.group_id=p_group_id and existing.inviter_id=auth.uid() and existing.recipient_id=p_recipient_id
      then return existing.id; end if;
    raise exception 'Invitation identifier unavailable' using errcode='42501';
  end if;
  if public.group_invitation_is_eligible(p_group_id,auth.uid(),p_recipient_id) is not true
    then raise exception 'Only accepted, unblocked friends can be invited'; end if;
  if exists(select 1 from public.conversation_participants where conversation_id=p_group_id and user_id=p_recipient_id)
    then raise exception 'This friend is already a member'; end if;
  if (select count(*) from public.conversation_participants where conversation_id=p_group_id)>=100
    then raise exception 'Group member limit reached (100)'; end if;
  update public.group_chat_invitations set status=case when expires_at<=now() then 'expired' else 'revoked' end,responded_at=now()
    where group_id=p_group_id and recipient_id=p_recipient_id and status='pending'
      and (expires_at<=now() or public.group_invitation_is_eligible(group_id,inviter_id,recipient_id) is not true);
  select * into existing from public.group_chat_invitations
    where group_id=p_group_id and recipient_id=p_recipient_id and status='pending';
  if found then return existing.id; end if;
  insert into public.group_chat_invitations(id,group_id,inviter_id,recipient_id)
    values(p_client_id,p_group_id,auth.uid(),p_recipient_id);
  return p_client_id;
end $$;

create or replace function public.list_group_chat_invitations(p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  return coalesce((select jsonb_agg(row_data order by created_at desc) from (
    select i.created_at,jsonb_build_object('id',i.id,'groupId',i.group_id,'groupName',coalesce(c.name,'Prayer group'),
      'inviterId',i.inviter_id,'inviterName',coalesce(p.full_name,'Someone'),
      'recipientId',i.recipient_id,'recipientName',coalesce(r.full_name,'Someone'),
      'createdAt',i.created_at,'expiresAt',i.expires_at,
      'status',case when i.status<>'pending' then i.status
        when i.expires_at<=now() then 'expired'
        when public.group_invitation_is_eligible(i.group_id,i.inviter_id,i.recipient_id) is not true then 'unavailable'
        else 'pending' end) row_data
    from public.group_chat_invitations i join public.conversations c on c.id=i.group_id
      left join public.profiles p on p.id=i.inviter_id left join public.profiles r on r.id=i.recipient_id
    where auth.uid() in (i.inviter_id,i.recipient_id)
    order by i.created_at desc,i.id limit 200
  ) rows),'[]'::jsonb);
end $$;

create or replace function public.respond_group_chat_invitation(p_invitation_id uuid,p_expected_user_id uuid,p_action text)
returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.group_chat_invitations; g uuid; desired text;
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  select group_id into g from public.group_chat_invitations where id=p_invitation_id
    and auth.uid() in (inviter_id,recipient_id);
  if not found then raise exception 'Invitation unavailable or access denied' using errcode='42501'; end if;
  -- Same lock order as membership and send operations prevents joining after cancellation/removal.
  perform 1 from public.conversations where id=g for update;
  select * into invitation from public.group_chat_invitations where id=p_invitation_id for update;
  if p_action in ('accept','decline') and invitation.recipient_id=auth.uid() then
    desired:=case when p_action='accept' then 'accepted' else 'declined' end;
  elsif p_action='revoke' and (invitation.inviter_id=auth.uid() or exists(
    select 1 from public.conversation_participants where conversation_id=g and user_id=auth.uid() and group_role='admin'
  )) then desired:='revoked';
  else raise exception 'Invitation action denied' using errcode='42501'; end if;
  if invitation.status=desired then
    if desired='accepted' and not exists(select 1 from public.conversation_participants where conversation_id=g and user_id=auth.uid())
      then raise exception 'Membership ended. Ask for a new invitation'; end if;
    return g;
  end if;
  if invitation.status<>'pending' then raise exception 'Invitation is no longer pending'; end if;
  if desired='accepted' then
    if invitation.expires_at<=now() then raise exception 'Invitation expired. Ask for a new invitation'; end if;
    if public.group_invitation_is_eligible(g,invitation.inviter_id,auth.uid()) is not true
      then raise exception 'Invitation is no longer available'; end if;
    if not exists(select 1 from public.conversation_participants where conversation_id=g and user_id=auth.uid())
      and (select count(*) from public.conversation_participants where conversation_id=g)>=100
      then raise exception 'Group member limit reached (100)'; end if;
    insert into public.conversation_participants(conversation_id,user_id,group_role) values(g,auth.uid(),'member') on conflict do nothing;
  end if;
  update public.group_chat_invitations set status=desired,responded_at=now() where id=p_invitation_id;
  return g;
end $$;

-- Keep existing membership management, but legacy "add" now sends an invitation;
-- it must never grant membership without the recipient's acceptance.
create or replace function public.change_group_chat_member(p_group_id uuid,p_expected_user_id uuid,p_user_id uuid,p_action text)
returns void language plpgsql security definer set search_path='' as $$
declare previous text;
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  perform 1 from public.conversations where id=p_group_id for update;
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,false,p_action<>'leave');
  if p_action='leave' and p_user_id is distinct from auth.uid() then raise exception 'You can only leave for yourself'; end if;
  if p_action='add' then
    if exists(select 1 from public.conversation_participants where conversation_id=p_group_id and user_id=p_user_id) then return; end if;
    perform public.invite_group_chat_friend(p_group_id,p_expected_user_id,p_user_id,gen_random_uuid());
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
    update public.group_chat_invitations set status='revoked',responded_at=now()
      where group_id=p_group_id and status='pending' and (recipient_id=p_user_id or inviter_id=p_user_id);
  else
    update public.conversation_participants set group_role=p_action where conversation_id=p_group_id and user_id=p_user_id;
    if previous='admin' and p_action<>'admin' then
      update public.group_chat_invitations set status='revoked',responded_at=now()
        where group_id=p_group_id and status='pending' and inviter_id=p_user_id;
    end if;
  end if;
end $$;

create or replace function public.group_chat_invite_candidates(p_group_id uuid,p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  perform public.require_group_chat_access(p_group_id,p_expected_user_id,false,true);
  return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(p.full_name,'Someone'),'avatar',coalesce(p.avatar_url,'')) order by p.full_name,p.id)
    from public.profiles p where public.group_invitation_is_eligible(p_group_id,auth.uid(),p.id)
    and not exists(select 1 from public.conversation_participants where conversation_id=p_group_id and user_id=p.id)
    and not exists(select 1 from public.group_chat_invitations where group_id=p_group_id and recipient_id=p.id
      and status='pending' and expires_at>now()
      and public.group_invitation_is_eligible(group_id,inviter_id,recipient_id))), '[]'::jsonb);
end $$;

revoke all on function public.invite_group_chat_friend(uuid,uuid,uuid,uuid),
  public.list_group_chat_invitations(uuid),public.respond_group_chat_invitation(uuid,uuid,text) from public,anon;
grant execute on function public.invite_group_chat_friend(uuid,uuid,uuid,uuid),
  public.list_group_chat_invitations(uuid),public.respond_group_chat_invitation(uuid,uuid,text) to authenticated;
-- Preserve the original explicit grants when CREATE OR REPLACE is applied.
revoke all on function public.change_group_chat_member(uuid,uuid,uuid,text),public.group_chat_invite_candidates(uuid,uuid) from public,anon;
grant execute on function public.change_group_chat_member(uuid,uuid,uuid,text),public.group_chat_invite_candidates(uuid,uuid) to authenticated;
select pg_notify('pgrst','reload schema');
commit;
