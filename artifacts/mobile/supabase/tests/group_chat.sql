-- Disposable fixtures, including Auth rows, are always rolled back.
begin;
create function pg_temp.check(ok boolean,label text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'Check failed: %',label; end if; end $$;
create function pg_temp.denied(command text,label text,expected text default null) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
  begin execute command;
  exception when others then
    if expected is not null and position(expected in sqlerrm)=0 then raise; end if;
    rejected:=true;
  end;
  if not rejected then raise exception 'Expected denial: %',label; end if;
end $$;
insert into auth.users(id,aud,role,email,raw_user_meta_data) values
 ('a1100000-0000-4000-8000-000000000001','authenticated','authenticated','group-fixture-a@example.invalid','{"full_name":"Group Fixture A","date_of_birth":"1990-01-01"}'),
 ('a1100000-0000-4000-8000-000000000002','authenticated','authenticated','group-fixture-b@example.invalid','{"full_name":"Group Fixture B","date_of_birth":"1990-01-01"}'),
 ('a1100000-0000-4000-8000-000000000003','authenticated','authenticated','group-fixture-c@example.invalid','{"full_name":"Group Fixture C","date_of_birth":"1990-01-01"}');
update public.profiles set full_name='Group Fixture A' where id='a1100000-0000-4000-8000-000000000001';
update public.profiles set full_name='Group Fixture B' where id='a1100000-0000-4000-8000-000000000002';
update public.profiles set full_name='Group Fixture C' where id='a1100000-0000-4000-8000-000000000003';
insert into public.friend_requests(sender_id,receiver_id,status) values(
 'a1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','accepted');
insert into public.prayer_requests(id,author_id,content,audience) values(
 'a1400000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','Fixture prayer','friends');
select set_config('request.jwt.claim.sub','a1100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
select public.create_prayer_chat_group('a1100000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001','Fixture group','{}');
select public.create_prayer_chat_group('a1100000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001','Fixture group','{}');
select pg_temp.check(jsonb_array_length(public.list_prayer_chat_groups('a1100000-0000-4000-8000-000000000001'))=1,'idempotent group creation');
select public.change_group_chat_member('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','add');
select set_config('request.jwt.claim.sub','a1100000-0000-4000-8000-000000000002',true);
select public.respond_group_chat_invitation(
  (select id from public.group_chat_invitations where group_id='a1200000-0000-4000-8000-000000000001' and recipient_id=auth.uid()),
  'a1100000-0000-4000-8000-000000000002','accept');
select set_config('request.jwt.claim.sub','a1100000-0000-4000-8000-000000000001',true);
select pg_temp.denied($q$select public.change_group_chat_member('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000003','add')$q$,'stranger cannot be added','Only accepted');
select pg_temp.denied($q$select public.change_group_chat_member('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','leave')$q$,'last admin cannot abandon members','Assign another admin');
select public.send_group_chat_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1300000-0000-4000-8000-000000000001','Persistent message');
select public.send_group_chat_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1300000-0000-4000-8000-000000000001','Persistent message');
select pg_temp.check((select count(*) from public.messages where conversation_id='a1200000-0000-4000-8000-000000000001')=1,'retry does not duplicate message');
select pg_temp.denied($q$select public.send_group_chat_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000009','Spoof')$q$,'sender spoof','access denied');
select set_config('request.jwt.claim.sub','a1100000-0000-4000-8000-000000000003',true);
select pg_temp.denied($q$select public.get_group_chat('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000003')$q$,'outsider cannot read','access denied');
select public.create_prayer_chat_group('a1100000-0000-4000-8000-000000000003','a1200000-0000-4000-8000-000000000002','Other group','{}');
select public.send_group_chat_message('a1200000-0000-4000-8000-000000000002','a1100000-0000-4000-8000-000000000003','a1300000-0000-4000-8000-000000000003','Private other group');
select set_config('request.jwt.claim.sub','a1100000-0000-4000-8000-000000000002',true);
select pg_temp.check(public.get_group_chat('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002')->'messages'->0->>'content'='Persistent message','member reload sees saved message');
select pg_temp.denied($q$update public.conversation_participants set group_role='admin' where conversation_id='a1200000-0000-4000-8000-000000000001' and user_id=auth.uid()$q$,'self promotion denied','permission denied');
select pg_temp.denied($q$update public.conversation_participants set conversation_id='a1200000-0000-4000-8000-000000000002' where user_id=auth.uid()$q$,'cannot move membership','permission denied');
select pg_temp.denied($q$select public.change_group_chat_member('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1100000-0000-4000-8000-000000000002','admin')$q$,'member cannot promote via RPC','access denied');
select public.react_to_group_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000001','support',true);
select public.react_to_group_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000001','support',true);
select pg_temp.check((select count(*) from public.message_reactions where message_id='a1300000-0000-4000-8000-000000000001')=1,'reaction retries are idempotent');
select public.react_to_group_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000001','pray',true);
select pg_temp.check((select reaction_type from public.message_reactions where message_id='a1300000-0000-4000-8000-000000000001')='pray','reaction changes persist');
select public.react_to_group_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000001','pray',false);
select public.react_to_group_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000001','pray',false);
select pg_temp.check((select count(*) from public.message_reactions where message_id='a1300000-0000-4000-8000-000000000001')=0,'reaction removal retries are idempotent');
select public.send_group_chat_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000002','Reply','a1300000-0000-4000-8000-000000000001');
select pg_temp.check(public.get_group_chat('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002')->'messages'->1->'reply'->>'content'='Persistent message','reply is server derived');
select pg_temp.denied($q$select public.send_group_chat_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000006','Reply','a1300000-0000-4000-8000-000000000003')$q$,'cross-group reply','Reply target');
select pg_temp.denied($q$select public.delete_group_chat_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000001')$q$,'cannot delete another sender','Only your own');
select public.send_group_chat_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000004','','a1300000-0000-4000-8000-000000000001','a1400000-0000-4000-8000-000000000001');
reset role;
update public.prayer_requests set audience='private' where id='a1400000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.check((select count(*) from public.messages where id='a1300000-0000-4000-8000-000000000004')=0,'later prayer privacy applies to raw RLS');
select pg_temp.check(jsonb_array_length(public.get_group_chat('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002')->'messages')=2,'later prayer privacy applies to RPC');
select public.delete_group_chat_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000002');
select pg_temp.denied($q$select public.react_to_group_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000002','amen',true)$q$,'deleted message cannot be reacted to','Message unavailable');
reset role;
insert into public.blocked_users(blocker_id,blocked_id) values('a1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002');
set local role authenticated;
select pg_temp.check((public.get_group_chat('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002')->>'canSend')::boolean=false,'blocked groups are read only');
select pg_temp.check((select count(*) from public.messages where sender_id='a1100000-0000-4000-8000-000000000001')=0,'blocked sender also excluded by raw RLS');
select pg_temp.denied($q$select public.send_group_chat_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000007','Blocked')$q$,'blocked cannot send','blocked');
select set_config('request.jwt.claim.sub','a1100000-0000-4000-8000-000000000001',true);
select public.change_group_chat_member('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','remove');
select set_config('request.jwt.claim.sub','a1100000-0000-4000-8000-000000000002',true);
select pg_temp.check((select count(*) from public.messages where conversation_id='a1200000-0000-4000-8000-000000000001')=0,'removed member loses raw history');
select pg_temp.denied($q$select public.get_group_chat('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002')$q$,'removed member loses RPC history','access denied');
select pg_temp.denied($q$select public.react_to_group_message('a1200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000001','pray',true)$q$,'removed cannot react','access denied');
select pg_temp.check(not has_function_privilege('anon','public.get_group_chat(uuid,uuid,uuid)','execute'),'anonymous RPC denied');
select pg_temp.check(not has_column_privilege('authenticated','public.conversation_participants','group_role','update'),'roles are server controlled');
select pg_temp.check(has_column_privilege('authenticated','public.conversation_participants','last_read_at','update'),'DM read updates preserved');
reset role;
select 'Group chat persistence, reactions, membership, spoofing, blocks, deletion and sharing privacy checks passed' as result;
rollback;
