begin;
-- Recipient-only behavior is deliberately not stored on the sender-readable
-- invitation rows: read/dismiss times are not shared read receipts.
create table if not exists public.group_invitation_alert_receipts (
  invitation_id uuid primary key references public.group_chat_invitations(id) on delete cascade,
  read_at timestamptz,
  dismissed_at timestamptz
);
alter table public.group_invitation_alert_receipts enable row level security;
revoke all on public.group_invitation_alert_receipts from public,anon,authenticated;

create or replace function public.list_group_invitation_alerts(p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  return coalesce((select jsonb_agg(row_data order by created_at desc,id) from (
    select i.id,i.created_at,jsonb_build_object(
      'id',i.id,'groupName',coalesce(c.name,'Prayer group'),
      'inviterName',coalesce(p.full_name,'Someone'),'createdAt',i.created_at,
      'unread',r.read_at is null) row_data
    from public.group_chat_invitations i
      join public.conversations c on c.id=i.group_id
      left join public.profiles p on p.id=i.inviter_id
      left join public.group_invitation_alert_receipts r on r.invitation_id=i.id
    where i.recipient_id=auth.uid() and i.status='pending' and i.expires_at>now()
      and r.dismissed_at is null
      and public.group_invitation_is_eligible(i.group_id,i.inviter_id,i.recipient_id)
    order by i.created_at desc,i.id limit 200
  ) alerts),'[]'::jsonb);
end $$;

create or replace function public.mark_group_invitation_alert(p_expected_user_id uuid,p_action text,p_invitation_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_group_invitation_identity(p_expected_user_id);
  if p_action='read_all' and p_invitation_id is null then
    insert into public.group_invitation_alert_receipts as receipt(invitation_id,read_at)
      select i.id,now() from public.group_chat_invitations i
        where i.recipient_id=auth.uid() and i.status='pending' and i.expires_at>now()
          and public.group_invitation_is_eligible(i.group_id,i.inviter_id,i.recipient_id)
      on conflict(invitation_id) do update set read_at=coalesce(receipt.read_at,excluded.read_at);
    return;
  end if;
  if p_action is null or p_action not in ('read','dismiss') or p_invitation_id is null
    then raise exception 'Invalid invitation alert action'; end if;
  perform 1 from public.group_chat_invitations where id=p_invitation_id and recipient_id=auth.uid();
  if not found then raise exception 'Invitation alert unavailable or access denied' using errcode='42501'; end if;
  insert into public.group_invitation_alert_receipts as receipt(invitation_id,read_at,dismissed_at)
    values(p_invitation_id,now(),case when p_action='dismiss' then now() else null end)
    on conflict(invitation_id) do update set
      read_at=coalesce(receipt.read_at,excluded.read_at),
      dismissed_at=coalesce(receipt.dismissed_at,excluded.dismissed_at);
end $$;

revoke all on function public.list_group_invitation_alerts(uuid),public.mark_group_invitation_alert(uuid,text,uuid) from public,anon;
grant execute on function public.list_group_invitation_alerts(uuid),public.mark_group_invitation_alert(uuid,text,uuid) to authenticated;
select pg_notify('pgrst','reload schema');
commit;
