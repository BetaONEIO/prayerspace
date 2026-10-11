-- All fixtures and mutations are isolated in this transaction and rolled back.
-- No real auth signup, mail, Storage API or deletion worker is invoked.
begin;
do $$
begin
  if exists(select 1 from auth.users where id in ('11111111-1111-4111-8111-111111111a11','22222222-2222-4222-8222-222222222b22'))
    then raise exception 'Reserved test IDs already exist; refusing to touch them'; end if;
end $$;
insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data, last_sign_in_at)
values
('11111111-1111-4111-8111-111111111a11','privacy-transaction-a@example.invalid','{"full_name":"Transaction A","date_of_birth":"1990-01-01"}','{"provider":"email"}',now()),
('22222222-2222-4222-8222-222222222b22','privacy-transaction-b@example.invalid','{"full_name":"Transaction B","date_of_birth":"1990-01-01"}','{"provider":"email"}',now());
insert into prayer_requests(id,author_id,content,audience)
values('33333333-3333-4333-8333-333333333c33','11111111-1111-4111-8111-111111111a11','PRIVATE TRANSACTION POST','private');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111a11","role":"authenticated"}',true);
do $$
declare response jsonb; report uuid; blocked boolean:=false;
begin
  response:=sync_private_journal('11111111-1111-4111-8111-111111111a11',
    '[{"id":"journal-transaction","expectedRevision":0,"entry":{"id":"journal-transaction","title":"A PRIVATE TRANSACTION","body":"first","tag":"reflection","timestamp":1,"isFavorite":false,"isAnswered":false}}]');
  if jsonb_array_length(response->'entries')<>1 then raise exception 'Initial journal save failed'; end if;
  response:=sync_private_journal('11111111-1111-4111-8111-111111111a11',
    '[{"id":"journal-transaction","expectedRevision":0,"entry":{"id":"journal-transaction","title":"A PRIVATE TRANSACTION","body":"stale edit","tag":"reflection","timestamp":1,"isFavorite":false,"isAnswered":false}}]');
  if jsonb_array_length(response->'conflicts')<>1 or response#>>'{entries,0,entry,body}'<>'first'
    then raise exception 'CAS overwrote a conflicting entry'; end if;
  report:=submit_abuse_report('11111111-1111-4111-8111-111111111a11','user','22222222-2222-4222-8222-222222222b22','transaction report');
  if report is null then raise exception 'Report was not saved'; end if;
  if submit_abuse_report('11111111-1111-4111-8111-111111111a11','user','22222222-2222-4222-8222-222222222b22','transaction report')<>report
    then raise exception 'Report retry was not idempotent'; end if;
  begin perform get_moderation_queue(); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Non-moderator accessed queue'; end if;
  blocked:=false;
  begin perform 1 from private_journal_entries; exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Client accessed raw private journal table'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222b22","role":"authenticated"}',true);
do $$
declare response jsonb; blocked boolean:=false;
begin
  response:=sync_private_journal('22222222-2222-4222-8222-222222222b22','[]');
  if jsonb_array_length(response->'entries')<>0 then raise exception 'B accessed A journal'; end if;
  response:=export_own_account_data('22222222-2222-4222-8222-222222222b22');
  if response::text like '%A PRIVATE TRANSACTION%' or response::text like '%PRIVATE TRANSACTION POST%' then
    raise exception 'Export included another account private content'; end if;
  begin perform export_own_account_data('11111111-1111-4111-8111-111111111a11'); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Forged export account was accepted'; end if;
  blocked:=false;
  begin perform submit_abuse_report('22222222-2222-4222-8222-222222222b22','post','33333333-3333-4333-8333-333333333c33','hidden post');
    exception when others then blocked:=true; end;
  if not blocked then raise exception 'B could report an inaccessible private post'; end if;
  blocked:=false;
  begin perform request_own_account_deletion('11111111-1111-4111-8111-111111111a11'); exception when others then blocked:=true; end;
  if not blocked then raise exception 'B could request A deletion'; end if;
  blocked:=false;
  begin insert into moderators(user_id) values('22222222-2222-4222-8222-222222222b22');
    exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'User could grant moderator access'; end if;
end $$;

reset role;
insert into moderators(user_id) values('11111111-1111-4111-8111-111111111a11');
update moderation_reports set created_at='0001-01-01' where reporter_id='11111111-1111-4111-8111-111111111a11';
update auth.users set last_sign_in_at=now()-interval '1 hour' where id='22222222-2222-4222-8222-222222222b22';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222b22","role":"authenticated"}',true);
do $$
declare blocked boolean:=false;
begin
  begin perform request_own_account_deletion('22222222-2222-4222-8222-222222222b22'); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Stale sign-in could request deletion'; end if;
end $$;
reset role;
update auth.users set last_sign_in_at=now() where id='22222222-2222-4222-8222-222222222b22';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111a11","role":"authenticated"}',true);
do $$
declare queue jsonb; fixture_report uuid; blocked boolean:=false;
begin
  queue:=get_moderation_queue();
  if jsonb_array_length(queue)<1 then raise exception 'Moderator cannot read saved report'; end if;
  select (r->>'id')::uuid into fixture_report from jsonb_array_elements(queue) r
    where r->>'reporter_id'='11111111-1111-4111-8111-111111111a11' limit 1;
  if fixture_report is null then raise exception 'Saved fixture report missing'; end if;
  begin perform review_abuse_report('22222222-2222-4222-8222-222222222b22',fixture_report,'resolved',false);
    exception when others then blocked:=true; end;
  if not blocked then raise exception 'Moderator actor mismatch accepted'; end if;
  perform review_abuse_report('11111111-1111-4111-8111-111111111a11',fixture_report,'resolved',false);
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222b22","role":"authenticated"}',true);
do $$ begin
  perform request_own_account_deletion('22222222-2222-4222-8222-222222222b22');
  perform request_own_account_deletion('22222222-2222-4222-8222-222222222b22');
end $$;
reset role;
do $$ begin
  if (select count(*) from account_deletion_jobs where user_id='22222222-2222-4222-8222-222222222b22')<>1
    then raise exception 'Deletion request was not idempotent'; end if;
end $$;
rollback;
select 'PASS: ownership, CAS, moderation authorization, private exports, recent authentication and idempotent deletion; all fixtures rolled back' as result;
