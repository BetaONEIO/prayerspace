-- Transactional fixtures: no real accounts or memberships are modified.
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
 ('b2100000-0000-4000-8000-000000000001','authenticated','authenticated','privacy-fixture-a@example.invalid','{"full_name":"Privacy Fixture A","date_of_birth":"1990-01-01"}'),
 ('b2100000-0000-4000-8000-000000000002','authenticated','authenticated','privacy-fixture-b@example.invalid','{"full_name":"Privacy Fixture B","date_of_birth":"1990-01-01"}'),
 ('b2100000-0000-4000-8000-000000000003','authenticated','authenticated','privacy-fixture-c@example.invalid','{"full_name":"Privacy Fixture C","date_of_birth":"1990-01-01"}');
insert into public.friend_requests(sender_id,receiver_id,status) values
 ('b2100000-0000-4000-8000-000000000001','b2100000-0000-4000-8000-000000000002','accepted');
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','b2100000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.check(public.get_group_invitation_preference(auth.uid())='friends','missing preference defaults to the existing friends-only policy');
select public.create_prayer_chat_group(auth.uid(),'b2200000-0000-4000-8000-000000000001','Invitation privacy test','{}');
select public.invite_group_chat_friend('b2200000-0000-4000-8000-000000000001',auth.uid(),'b2100000-0000-4000-8000-000000000002','b2500000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','b2100000-0000-4000-8000-000000000002',true);
select pg_temp.check(public.set_group_invitation_preference(auth.uid(),'none')='none','save No one');
select pg_temp.check(public.get_group_invitation_preference(auth.uid())='none','read persisted No one');
select pg_temp.check((select status='revoked' from public.group_chat_invitations where id='b2500000-0000-4000-8000-000000000001'),'No one cancels pending invitations');
select pg_temp.denied($q$select public.respond_group_chat_invitation('b2500000-0000-4000-8000-000000000001',auth.uid(),'accept')$q$,'cancelled invitation cannot grant access');
select pg_temp.denied($q$select public.get_group_chat('b2200000-0000-4000-8000-000000000001',auth.uid())$q$,'No one does not grant membership');
select pg_temp.denied($q$select public.set_group_invitation_preference(auth.uid(),'everyone')$q$,'unsupported Everyone cannot broaden authorization');
select pg_temp.denied($q$select public.set_group_invitation_preference(auth.uid(),null)$q$,'missing preference rejected');
select pg_temp.check(public.get_group_invitation_preference(auth.uid())='none','failed saves preserve preference');

select set_config('request.jwt.claim.sub','b2100000-0000-4000-8000-000000000001',true);
select pg_temp.check(public.get_group_invitation_preference(auth.uid())='friends','one account cannot inherit another preference');
select pg_temp.denied($q$select public.get_group_invitation_preference('b2100000-0000-4000-8000-000000000002')$q$,'reading another account preference denied');
select pg_temp.denied($q$select public.set_group_invitation_preference('b2100000-0000-4000-8000-000000000002','friends')$q$,'changing another account preference denied');
select pg_temp.denied($q$select * from public.group_invitation_preferences$q$,'direct preference enumeration denied');
select pg_temp.denied($q$update public.group_invitation_preferences set preference='friends' where user_id='b2100000-0000-4000-8000-000000000002'$q$,'direct writes denied');
select pg_temp.check(jsonb_array_length(public.group_chat_invite_candidates('b2200000-0000-4000-8000-000000000001',auth.uid()))=0,'No one recipients are not invitation candidates');
select pg_temp.denied($q$select public.invite_group_chat_friend('b2200000-0000-4000-8000-000000000001',auth.uid(),'b2100000-0000-4000-8000-000000000002','b2500000-0000-4000-8000-000000000002')$q$,'modified clients cannot send to No one');
select pg_temp.denied($q$select public.invite_group_chat_friend('b2200000-0000-4000-8000-000000000001',auth.uid(),'b2100000-0000-4000-8000-000000000002','b2500000-0000-4000-8000-000000000001')$q$,'replaying send identifiers cannot bypass No one');
select pg_temp.denied($q$select public.change_group_chat_member('b2200000-0000-4000-8000-000000000001',auth.uid(),'b2100000-0000-4000-8000-000000000002','add')$q$,'legacy add cannot bypass No one');
select pg_temp.denied($q$select public.invite_group_chat_friend('b2200000-0000-4000-8000-000000000001',auth.uid(),'b2100000-0000-4000-8000-000000000003','b2500000-0000-4000-8000-000000000003')$q$,'Friends still rejects strangers');
select pg_temp.check(not has_function_privilege('anon','public.get_group_invitation_preference(uuid)','execute'),'anonymous reads denied');
select pg_temp.check(not has_function_privilege('anon','public.set_group_invitation_preference(uuid,text)','execute'),'anonymous writes denied');
select pg_temp.check(not has_function_privilege('authenticated','public.lock_group_invitation_preference(uuid)','execute'),'clients cannot acquire arbitrary preference locks');

select set_config('request.jwt.claim.sub','b2100000-0000-4000-8000-000000000002',true);
select public.set_group_invitation_preference(auth.uid(),'friends');
select pg_temp.denied($q$select public.respond_group_chat_invitation('b2500000-0000-4000-8000-000000000001',auth.uid(),'accept')$q$,'reenabling invitations does not revive cancelled requests');
select set_config('request.jwt.claim.sub','b2100000-0000-4000-8000-000000000001',true);
select pg_temp.check(jsonb_array_length(public.group_chat_invite_candidates('b2200000-0000-4000-8000-000000000001',auth.uid()))=1,'Friends restores candidate visibility');
select public.invite_group_chat_friend('b2200000-0000-4000-8000-000000000001',auth.uid(),'b2100000-0000-4000-8000-000000000002','b2500000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','b2100000-0000-4000-8000-000000000002',true);
select public.respond_group_chat_invitation('b2500000-0000-4000-8000-000000000002',auth.uid(),'accept');
select public.set_group_invitation_preference(auth.uid(),'none');
select pg_temp.check(exists(select 1 from public.conversation_participants where conversation_id='b2200000-0000-4000-8000-000000000001' and user_id=auth.uid()),'No one preserves existing memberships');
select pg_temp.check(public.get_group_chat('b2200000-0000-4000-8000-000000000001',auth.uid()) is not null,'existing members keep chat access');
select public.respond_group_chat_invitation('b2500000-0000-4000-8000-000000000002',auth.uid(),'accept');
select set_config('request.jwt.claim.sub','b2100000-0000-4000-8000-000000000001',true);
select public.change_group_chat_member('b2200000-0000-4000-8000-000000000001',auth.uid(),'b2100000-0000-4000-8000-000000000002','remove');
select pg_temp.denied($q$select public.invite_group_chat_friend('b2200000-0000-4000-8000-000000000001',auth.uid(),'b2100000-0000-4000-8000-000000000002','b2500000-0000-4000-8000-000000000004')$q$,'preference remains enforced after removal');
select set_config('request.jwt.claim.sub','b2100000-0000-4000-8000-000000000003',true);
select pg_temp.check(public.get_group_invitation_preference(auth.uid())='friends','account switching reads only the current account');
reset role;
delete from auth.users where id='b2100000-0000-4000-8000-000000000002';
select pg_temp.check(not exists(select 1 from public.group_invitation_preferences where user_id='b2100000-0000-4000-8000-000000000002'),'account deletion removes the preference');
select 'Group invitation privacy persistence, isolation, enforcement, cancellation and membership checks passed' as result;
rollback;
