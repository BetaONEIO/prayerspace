-- Isolated fixtures: rollback prevents changing any real accounts or activity.
begin;
do $$ begin
  if exists(select 1 from auth.users where id in (
    '11111111-1111-4111-8111-111111111d11','22222222-2222-4222-8222-222222222d22','33333333-3333-4333-8333-333333333d33'))
    then raise exception 'Reserved test accounts exist; refusing to modify them'; end if;
end $$;
insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data,last_sign_in_at) values
('11111111-1111-4111-8111-111111111d11','received-a@example.invalid','{"full_name":"Fixture A","date_of_birth":"1990-01-01"}','{"provider":"email"}',now()),
('22222222-2222-4222-8222-222222222d22','received-b@example.invalid','{"full_name":"Fixture B","date_of_birth":"1990-01-01"}','{"provider":"email"}',now()),
('33333333-3333-4333-8333-333333333d33','received-c@example.invalid','{"full_name":"Fixture C","date_of_birth":"1990-01-01"}','{"provider":"email"}',now());
insert into public.friend_requests(sender_id,receiver_id,status)
values('11111111-1111-4111-8111-111111111d11','22222222-2222-4222-8222-222222222d22','accepted');
insert into public.prayer_requests(id,author_id,content,audience,is_anonymous,status,event_date) values
('44444444-4444-4444-8444-444444444d44','11111111-1111-4111-8111-111111111d11','Visible request','everyone',false,'ongoing','2027-01-01'),
('55555555-5555-4555-8555-555555555d55','11111111-1111-4111-8111-111111111d11','Friends request','friends',false,'answered',null),
('66666666-6666-4666-8666-666666666d66','11111111-1111-4111-8111-111111111d11','Private request','private',false,'ongoing',null),
('77777777-7777-4777-8777-777777777d77','11111111-1111-4111-8111-111111111d11','Anonymous request','everyone',true,'ongoing',null),
('88888888-8888-4888-8888-888888888d88','11111111-1111-4111-8111-111111111d11','Archived request','everyone',false,'archived',null);
insert into public.prayer_request_updates(request_id,author_id,content,follow_up_option)
values('44444444-4444-4444-8444-444444444d44','11111111-1111-4111-8111-111111111d11','Real saved update','share_update');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222d22","role":"authenticated"}',true);
do $$
declare detail jsonb; ack jsonb; rejected boolean:=false;
begin
  detail:=public.get_received_prayer_details('44444444-4444-4444-8444-444444444d44');
  if detail->>'content'<>'Visible request' or detail->>'senderName'<>'Fixture A'
    or detail->>'eventDate'<>'2027-01-01' or detail#>>'{updates,0,content}'<>'Real saved update'
    then raise exception 'Saved detail fields did not load'; end if;
  if public.get_received_prayer_details('55555555-5555-4555-8555-555555555d55')->>'status'<>'answered'
    then raise exception 'Friend visibility or status failed'; end if;
  if public.get_received_prayer_details('66666666-6666-4666-8666-666666666d66') is not null
    or public.get_received_prayer_details('88888888-8888-4888-8888-888888888d88') is not null
    then raise exception 'Private or archived content leaked'; end if;
  if jsonb_array_length(public.get_received_prayers())<>3 then raise exception 'Inbox returned wrong records'; end if;
  detail:=public.get_received_prayer_details('77777777-7777-4777-8777-777777777d77');
  if detail->>'senderId'<>'' or detail->>'senderName'<>'Anonymous' or detail->>'senderAvatar'<>''
    then raise exception 'Anonymous identity leaked'; end if;
  ack:=public.pray_for_received_request('22222222-2222-4222-8222-222222222d22','44444444-4444-4444-8444-444444444d44');
  if ack->>'prayerCount'<>'1' then raise exception 'Prayer acknowledgement failed'; end if;
  perform public.pray_for_received_request('22222222-2222-4222-8222-222222222d22','44444444-4444-4444-8444-444444444d44');
  detail:=public.get_received_prayer_details('44444444-4444-4444-8444-444444444d44');
  if detail->>'prayerCount'<>'1' or detail->>'hasPrayed'<>'true' then raise exception 'Prayer count or idempotence failed'; end if;
  begin
    perform public.pray_for_received_request('11111111-1111-4111-8111-111111111d11','44444444-4444-4444-8444-444444444d44');
  exception when others then rejected:=true;
  end;
  if not rejected then raise exception 'Spoofed account accepted'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333d33","role":"authenticated"}',true);
do $$
declare rejected boolean:=false;
begin
  if public.get_received_prayer_details('55555555-5555-4555-8555-555555555d55') is not null
    or jsonb_array_length(public.get_received_prayers())<>0
    then raise exception 'Stranger saw friends-only content or inbox'; end if;
  begin
    perform public.pray_for_received_request('33333333-3333-4333-8333-333333333d33','55555555-5555-4555-8555-555555555d55');
  exception when others then rejected:=true;
  end;
  if not rejected then raise exception 'Stranger prayed for inaccessible request'; end if;
end $$;
reset role;
insert into public.blocked_users(blocker_id,blocked_id)
values('11111111-1111-4111-8111-111111111d11','22222222-2222-4222-8222-222222222d22');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222d22","role":"authenticated"}',true);
do $$
declare rejected boolean:=false;
begin
  if public.get_received_prayer_details('44444444-4444-4444-8444-444444444d44') is not null
    or jsonb_array_length(public.get_received_prayers())<>0 then raise exception 'Blocked content leaked'; end if;
  begin
    perform public.pray_for_received_request('22222222-2222-4222-8222-222222222d22','44444444-4444-4444-8444-444444444d44');
  exception when others then rejected:=true;
  end;
  if not rejected then raise exception 'Blocked request accepted'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.get_received_prayer_details(uuid)','execute')
    or has_function_privilege('anon','public.pray_for_received_request(uuid,uuid)','execute')
    then raise exception 'Anonymous RPC access allowed'; end if;
end $$;
rollback;
select 'PASS: real details, inbox, updates, anonymous identity, privacy, blocks and durable idempotent prayers (fixtures rolled back)' as result;
