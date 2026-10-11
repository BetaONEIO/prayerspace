begin;

-- Private account settings are accessible only through identity-checked RPCs.
create table if not exists public.group_invitation_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preference text not null check (preference in ('friends','none'))
);
alter table public.group_invitation_preferences enable row level security;
revoke all on public.group_invitation_preferences from public,anon,authenticated;

create or replace function public.lock_group_invitation_preference(recipient uuid)
returns void language sql security definer set search_path='' as $$
  select pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('group-invitation-preference:' || recipient::text,0));
$$;
revoke all on function public.lock_group_invitation_preference(uuid) from public,anon,authenticated;

create or replace function public.get_group_invitation_preference(p_expected_user_id uuid)
returns text language plpgsql security definer set search_path='' as $$
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  return coalesce((select preference from public.group_invitation_preferences where user_id=auth.uid()),'friends');
end $$;

create or replace function public.set_group_invitation_preference(p_expected_user_id uuid,p_preference text)
returns text language plpgsql security definer set search_path='' as $$
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  if p_preference is null or p_preference not in ('friends','none')
    then raise exception 'Choose Friends or No one'; end if;
  -- Serialize against sends and responses for this recipient. Do not acquire a
  -- conversation lock here: group operations lock conversation, then recipient,
  -- then invitation rows. This setter locks recipient, then invitation rows only.
  perform public.lock_group_invitation_preference(auth.uid());
  insert into public.group_invitation_preferences(user_id,preference) values(auth.uid(),p_preference)
    on conflict(user_id) do update set preference=excluded.preference;
  if p_preference='none' then
    update public.group_chat_invitations set status='revoked',responded_at=now()
      where recipient_id=auth.uid() and status='pending';
  end if;
  return p_preference;
end $$;

create or replace function public.group_invitation_is_eligible(g uuid,inviter uuid,recipient uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select inviter<>recipient
    and coalesce((select preference from public.group_invitation_preferences where user_id=recipient),'friends')='friends'
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
  perform public.lock_group_invitation_preference(p_recipient_id);
  if public.group_invitation_is_eligible(p_group_id,auth.uid(),p_recipient_id) is not true
    then raise exception 'Only accepted, unblocked friends who are accepting invitations can be invited'; end if;
  select * into existing from public.group_chat_invitations where id=p_client_id;
  if found then
    if existing.group_id=p_group_id and existing.inviter_id=auth.uid() and existing.recipient_id=p_recipient_id
      then return existing.id; end if;
    raise exception 'Invitation identifier unavailable' using errcode='42501';
  end if;
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

create or replace function public.respond_group_chat_invitation(p_invitation_id uuid,p_expected_user_id uuid,p_action text)
returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.group_chat_invitations; g uuid; recipient uuid; desired text;
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  select group_id,recipient_id into g,recipient from public.group_chat_invitations where id=p_invitation_id
    and auth.uid() in (inviter_id,recipient_id);
  if not found then raise exception 'Invitation unavailable or access denied' using errcode='42501'; end if;
  perform 1 from public.conversations where id=g for update;
  perform public.lock_group_invitation_preference(recipient);
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

revoke all on function public.get_group_invitation_preference(uuid),public.set_group_invitation_preference(uuid,text),
  public.invite_group_chat_friend(uuid,uuid,uuid,uuid),public.respond_group_chat_invitation(uuid,uuid,text) from public,anon;
grant execute on function public.get_group_invitation_preference(uuid),public.set_group_invitation_preference(uuid,text),
  public.invite_group_chat_friend(uuid,uuid,uuid,uuid),public.respond_group_chat_invitation(uuid,uuid,text) to authenticated;
select pg_notify('pgrst','reload schema');
commit;
