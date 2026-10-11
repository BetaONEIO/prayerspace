-- All synthetic accounts and trigger-created data are rolled back.
begin;
create function pg_temp.check(ok boolean,label text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'Check failed: %',label; end if; end $$;
create function pg_temp.denied(command text,label text) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
  begin execute command; exception when others then rejected:=true; end;
  if not rejected then raise exception 'Expected denial: %',label; end if;
end $$;
insert into auth.users(id,aud,role,email,raw_user_meta_data) values
 ('b3100000-0000-4000-8000-000000000001','authenticated','authenticated','alert-fixture-a@example.invalid','{"full_name":"Alert Fixture A","date_of_birth":"1990-01-01"}'),
 ('b3100000-0000-4000-8000-000000000002','authenticated','authenticated','alert-fixture-b@example.invalid','{"full_name":"Alert Fixture B","date_of_birth":"1990-01-01"}'),
 ('b3100000-0000-4000-8000-000000000003','authenticated','authenticated','alert-fixture-c@example.invalid','{"full_name":"Alert Fixture C","date_of_birth":"1990-01-01"}');
insert into public.friend_requests(sender_id,receiver_id,status) values
 ('b3100000-0000-4000-8000-000000000001','b3100000-0000-4000-8000-000000000002','accepted');
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','b3100000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.create_prayer_chat_group(auth.uid(),'b3200000-0000-4000-8000-000000000001','Alert test one','{}');
select public.create_prayer_chat_group(auth.uid(),'b3200000-0000-4000-8000-000000000002','Alert test two','{}');
select public.invite_group_chat_friend('b3200000-0000-4000-8000-000000000001',auth.uid(),'b3100000-0000-4000-8000-000000000002','b3500000-0000-4000-8000-000000000001');
select public.invite_group_chat_friend('b3200000-0000-4000-8000-000000000002',auth.uid(),'b3100000-0000-4000-8000-000000000002','b3500000-0000-4000-8000-000000000002');
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=0,'sender does not receive recipient alerts');
select pg_temp.denied($q$select public.mark_group_invitation_alert(auth.uid(),'dismiss','b3500000-0000-4000-8000-000000000001')$q$,'sender cannot dismiss recipient alerts');
select public.mark_group_invitation_alert(auth.uid(),'read_all');
select set_config('request.jwt.claim.sub','b3100000-0000-4000-8000-000000000003',true);
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=0,'outsider list empty');
select pg_temp.denied($q$select public.mark_group_invitation_alert(auth.uid(),'read','b3500000-0000-4000-8000-000000000001')$q$,'copied ID cannot mutate another recipient');
select pg_temp.denied($q$select public.list_group_invitation_alerts('b3100000-0000-4000-8000-000000000002')$q$,'expected identity spoof denied');
select set_config('request.jwt.claim.sub','b3100000-0000-4000-8000-000000000002',true);
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=2,'received pending invitations become alerts');
select pg_temp.check((select bool_and((a->>'unread')::boolean) from jsonb_array_elements(public.list_group_invitation_alerts(auth.uid())) a),'new alerts are unread; sender read_all did not change them');
select public.mark_group_invitation_alert(auth.uid(),'read','b3500000-0000-4000-8000-000000000001');
select public.mark_group_invitation_alert(auth.uid(),'read','b3500000-0000-4000-8000-000000000001');
select pg_temp.check((select count(*)=1 from jsonb_array_elements(public.list_group_invitation_alerts(auth.uid())) a where (a->>'unread')::boolean),'read persists and retries do not duplicate receipt state');
select public.mark_group_invitation_alert(auth.uid(),'read_all');
select pg_temp.check((select bool_and(not (a->>'unread')::boolean) from jsonb_array_elements(public.list_group_invitation_alerts(auth.uid())) a),'mark all read persists');
select public.mark_group_invitation_alert(auth.uid(),'dismiss','b3500000-0000-4000-8000-000000000001');
select public.mark_group_invitation_alert(auth.uid(),'dismiss','b3500000-0000-4000-8000-000000000001');
select public.mark_group_invitation_alert(auth.uid(),'read','b3500000-0000-4000-8000-000000000001');
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=1,'dismissal persists and cannot be undone by a late read');
select pg_temp.check((select status='pending' from public.group_chat_invitations where id='b3500000-0000-4000-8000-000000000001'),'dismissal is not declining the invitation');
select pg_temp.check(not exists(select 1 from public.conversation_participants where user_id=auth.uid()),'reading and dismissing grant no membership');
select pg_temp.denied($q$select * from public.group_invitation_alert_receipts$q$,'even recipient raw receipt enumeration denied');
select pg_temp.denied($q$update public.group_invitation_alert_receipts set dismissed_at=null$q$,'direct receipt writes denied');
select pg_temp.denied($q$select public.mark_group_invitation_alert(auth.uid(),'accept','b3500000-0000-4000-8000-000000000001')$q$,'alert actions cannot accept invitations');
select pg_temp.check(not has_function_privilege('anon','public.list_group_invitation_alerts(uuid)','execute'),'anonymous lists denied');
select pg_temp.check(not has_function_privilege('anon','public.mark_group_invitation_alert(uuid,text,uuid)','execute'),'anonymous writes denied');

select public.respond_group_chat_invitation('b3500000-0000-4000-8000-000000000001',auth.uid(),'decline');
select set_config('request.jwt.claim.sub','b3100000-0000-4000-8000-000000000001',true);
select pg_temp.denied($q$select * from public.group_invitation_alert_receipts$q$,'recipient read/dismiss behavior is not exposed to the sender');
select public.invite_group_chat_friend('b3200000-0000-4000-8000-000000000001',auth.uid(),'b3100000-0000-4000-8000-000000000002','b3500000-0000-4000-8000-000000000003');
select public.respond_group_chat_invitation('b3500000-0000-4000-8000-000000000002',auth.uid(),'revoke');
select set_config('request.jwt.claim.sub','b3100000-0000-4000-8000-000000000002',true);
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=1,'revoked invitations no longer alert');
select pg_temp.check((select (a->>'unread')::boolean from jsonb_array_elements(public.list_group_invitation_alerts(auth.uid())) a where a->>'id'='b3500000-0000-4000-8000-000000000003'),'fresh invitation does not inherit old dismissal');
select public.respond_group_chat_invitation('b3500000-0000-4000-8000-000000000003',auth.uid(),'accept');
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=0,'accepted invitations no longer alert');
select set_config('request.jwt.claim.sub','b3100000-0000-4000-8000-000000000001',true);
select public.invite_group_chat_friend('b3200000-0000-4000-8000-000000000002',auth.uid(),'b3100000-0000-4000-8000-000000000002','b3500000-0000-4000-8000-000000000004');
select set_config('request.jwt.claim.sub','b3100000-0000-4000-8000-000000000002',true);
select public.set_group_invitation_preference(auth.uid(),'none');
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=0,'No one removes cancelled invitation alerts');
select public.set_group_invitation_preference(auth.uid(),'friends');
select set_config('request.jwt.claim.sub','b3100000-0000-4000-8000-000000000001',true);
select public.invite_group_chat_friend('b3200000-0000-4000-8000-000000000002',auth.uid(),'b3100000-0000-4000-8000-000000000002','b3500000-0000-4000-8000-000000000005');
reset role;
insert into public.blocked_users(blocker_id,blocked_id) values('b3100000-0000-4000-8000-000000000002','b3100000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','b3100000-0000-4000-8000-000000000002',true);
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=0,'blocked invitations do not alert');
reset role;
delete from public.blocked_users where blocker_id='b3100000-0000-4000-8000-000000000002';
update public.friend_requests set status='declined' where sender_id='b3100000-0000-4000-8000-000000000001' and receiver_id='b3100000-0000-4000-8000-000000000002';
set local role authenticated;
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=0,'lost friendship removes alerts');
reset role;
update public.friend_requests set status='accepted' where sender_id='b3100000-0000-4000-8000-000000000001' and receiver_id='b3100000-0000-4000-8000-000000000002';
update public.group_chat_invitations set expires_at=now()-interval '1 second' where id='b3500000-0000-4000-8000-000000000005';
set local role authenticated;
select pg_temp.check(jsonb_array_length(public.list_group_invitation_alerts(auth.uid()))=0,'expiration removes alerts without a background worker');
reset role;
delete from public.conversations where id='b3200000-0000-4000-8000-000000000002';
select pg_temp.check(not exists(select 1 from public.group_invitation_alert_receipts where invitation_id='b3500000-0000-4000-8000-000000000002'),'deleted invitation receipts cascade');
select 'Group invitation alert privacy, persistence, read/dismiss retries, lifecycle and account isolation checks passed' as result;
rollback;
