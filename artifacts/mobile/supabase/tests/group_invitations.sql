-- All fixtures and their trigger-created records are rolled back.
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
 ('b1100000-0000-4000-8000-000000000001','authenticated','authenticated','invitation-fixture-a@example.invalid','{"full_name":"Invite Fixture A","date_of_birth":"1990-01-01"}'),
 ('b1100000-0000-4000-8000-000000000002','authenticated','authenticated','invitation-fixture-b@example.invalid','{"full_name":"Invite Fixture B","date_of_birth":"1990-01-01"}'),
 ('b1100000-0000-4000-8000-000000000003','authenticated','authenticated','invitation-fixture-c@example.invalid','{"full_name":"Invite Fixture C","date_of_birth":"1990-01-01"}');
insert into public.friend_requests(sender_id,receiver_id,status) values(
 'b1100000-0000-4000-8000-000000000001','b1100000-0000-4000-8000-000000000002','accepted');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
select public.create_prayer_chat_group(auth.uid(),'b1200000-0000-4000-8000-000000000001','Invitation test','{}');
select public.invite_group_chat_friend('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000002','b1500000-0000-4000-8000-000000000001');
select public.invite_group_chat_friend('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000002','b1500000-0000-4000-8000-000000000001');
select pg_temp.check(public.invite_group_chat_friend('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000002','b1500000-0000-4000-8000-000000000002')='b1500000-0000-4000-8000-000000000001','different operation IDs deduplicate a pending invitation');
select pg_temp.check((select count(*) from public.conversation_participants where conversation_id='b1200000-0000-4000-8000-000000000001')=1,'sending is not membership');
select pg_temp.denied($q$select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000001',auth.uid(),'accept')$q$,'sender cannot accept for recipient');
select pg_temp.denied($q$select public.invite_group_chat_friend('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000003','b1500000-0000-4000-8000-000000000003')$q$,'stranger cannot be invited');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000003',true);
select pg_temp.check(jsonb_array_length(public.list_group_chat_invitations(auth.uid()))=0,'outsider list empty');
select pg_temp.check((select count(*) from public.group_chat_invitations)=0,'outsider raw rows hidden');
select pg_temp.denied($q$select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000001',auth.uid(),'accept')$q$,'copied invitation ID cannot grant access');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000002',true);
select pg_temp.denied($q$select public.get_group_chat('b1200000-0000-4000-8000-000000000001',auth.uid())$q$,'pending recipient cannot read chat');
select pg_temp.denied($q$select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000001','b1100000-0000-4000-8000-000000000001','accept')$q$,'expected identity spoof denied');
select pg_temp.denied($q$update public.group_chat_invitations set status='accepted' where id='b1500000-0000-4000-8000-000000000001'$q$,'direct status changes denied');
select pg_temp.denied($q$insert into public.conversation_participants(conversation_id,user_id) values('b1200000-0000-4000-8000-000000000001',auth.uid())$q$,'direct self joining denied');
select pg_temp.check(public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000001',auth.uid(),'accept')='b1200000-0000-4000-8000-000000000001','accept returns exact invited group');
select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000001',auth.uid(),'accept');
select pg_temp.check((select count(*) from public.conversation_participants where conversation_id='b1200000-0000-4000-8000-000000000001')=2,'accept retries do not duplicate membership');
select pg_temp.check((select group_role from public.conversation_participants where conversation_id='b1200000-0000-4000-8000-000000000001' and user_id=auth.uid())='member','accept never promotes recipient');
select pg_temp.check(public.get_group_chat('b1200000-0000-4000-8000-000000000001',auth.uid())->>'id'='b1200000-0000-4000-8000-000000000001','accepted recipient can load correct chat');
select pg_temp.denied($q$select public.invite_group_chat_friend('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000003','b1500000-0000-4000-8000-000000000003')$q$,'ordinary member cannot invite');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000001',true);
select public.change_group_chat_member('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000002','remove');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000002',true);
select pg_temp.denied($q$select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000001',auth.uid(),'accept')$q$,'old accepted invitation cannot rejoin after removal');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000001',true);
select public.invite_group_chat_friend('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000002','b1500000-0000-4000-8000-000000000004');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000002',true);
select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000004',auth.uid(),'decline');
select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000004',auth.uid(),'decline');
select pg_temp.denied($q$select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000004',auth.uid(),'accept')$q$,'declined invitation cannot be accepted');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000001',true);
select public.invite_group_chat_friend('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000002','b1500000-0000-4000-8000-000000000005');
select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000005',auth.uid(),'revoke');
select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000005',auth.uid(),'revoke');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000002',true);
select pg_temp.denied($q$select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000005',auth.uid(),'accept')$q$,'cancelled invitation cannot be accepted');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000001',true);
select public.invite_group_chat_friend('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000002','b1500000-0000-4000-8000-000000000006');
reset role;
update public.group_chat_invitations set expires_at=now()-interval '1 second' where id='b1500000-0000-4000-8000-000000000006';
set local role authenticated;
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000002',true);
select pg_temp.check(exists(select 1 from jsonb_array_elements(public.list_group_chat_invitations(auth.uid())) i
  where i->>'id'='b1500000-0000-4000-8000-000000000006' and i->>'status'='expired'),'expiration is visible without a worker');
select pg_temp.denied($q$select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000006',auth.uid(),'accept')$q$,'expired invitation cannot be accepted');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000001',true);
select public.invite_group_chat_friend('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000002','b1500000-0000-4000-8000-000000000007');
reset role;
insert into public.blocked_users(blocker_id,blocked_id) values('b1100000-0000-4000-8000-000000000002','b1100000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000002',true);
select pg_temp.denied($q$select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000007',auth.uid(),'accept')$q$,'new block rechecked at acceptance');
reset role;
delete from public.blocked_users where blocker_id='b1100000-0000-4000-8000-000000000002';
update public.friend_requests set status='declined' where sender_id='b1100000-0000-4000-8000-000000000001' and receiver_id='b1100000-0000-4000-8000-000000000002';
set local role authenticated;
select pg_temp.denied($q$select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000007',auth.uid(),'accept')$q$,'friendship rechecked at acceptance');
select pg_temp.check(not has_function_privilege('anon','public.respond_group_chat_invitation(uuid,uuid,text)','execute'),'anonymous acceptance denied');
reset role;
update public.friend_requests set status='accepted' where sender_id='b1100000-0000-4000-8000-000000000001' and receiver_id='b1100000-0000-4000-8000-000000000002';
set local role authenticated;
select public.respond_group_chat_invitation('b1500000-0000-4000-8000-000000000007',auth.uid(),'accept');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000001',true);
select public.change_group_chat_member('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000002','admin');
reset role;
insert into public.friend_requests(sender_id,receiver_id,status) values('b1100000-0000-4000-8000-000000000001','b1100000-0000-4000-8000-000000000003','accepted');
set local role authenticated;
select public.change_group_chat_member('b1200000-0000-4000-8000-000000000001',auth.uid(),'b1100000-0000-4000-8000-000000000003','add');
select pg_temp.check(not exists(select 1 from public.conversation_participants where conversation_id='b1200000-0000-4000-8000-000000000001' and user_id='b1100000-0000-4000-8000-000000000003'),'legacy add grants no membership');
select public.change_group_chat_member('b1200000-0000-4000-8000-000000000001',auth.uid(),auth.uid(),'member');
select set_config('request.jwt.claim.sub','b1100000-0000-4000-8000-000000000003',true);
select pg_temp.denied($q$select public.respond_group_chat_invitation((select id from public.group_chat_invitations where recipient_id=auth.uid()),auth.uid(),'accept')$q$,'admin demotion revokes pending invitations');
reset role;
select 'Group invitation authentication, consent, privacy, retries, cancellation, expiry, blocks, friendship and revocation checks passed' as result;
rollback;
