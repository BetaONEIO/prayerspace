-- Apply only to the SAME development project used by the mobile app.
-- Transactional and rerunnable. No user deletion, fabricated DOBs, or
-- replacement of existing auth/profile triggers or RLS policies.
-- DOB SELECT is private; other existing profile columns remain readable.
begin;

alter table public.profiles add column if not exists date_of_birth date;

-- Reject an unexpected pre-existing type rather than coercing stored data.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'date_of_birth' and data_type = 'date'
  ) then
    raise exception 'profiles.date_of_birth must be a date; review the existing column before proceeding';
  end if;
end;
$$;

create or replace function public.prayer_space_parse_dob(value text)
returns date language plpgsql immutable set search_path = ''
as $$
declare
  parsed date;
begin
  if value is null or value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return null;
  end if;
  begin
    parsed := value::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    return null;
  end;
  if parsed < date '1900-01-01' or to_char(parsed, 'YYYY-MM-DD') <> value then
    return null;
  end if;
  return parsed;
end;
$$;

create or replace function public.prayer_space_require_email_dob()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  dob date;
begin
  -- Keep the existing OAuth scope; separate tasks govern those age checks.
  if coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email' then
    return new;
  end if;
  dob := public.prayer_space_parse_dob(new.raw_user_meta_data->>'date_of_birth');
  if dob is null or dob > current_date then
    raise exception 'dob_required: Date of birth is required and must be valid.'
      using errcode = 'P0001';
  end if;
  if extract(year from age(current_date, dob)) < 13 then
    raise exception 'age_verification_failed: You must be at least 13 years old to create an account.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.prayer_space_guard_profile_dob()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.date_of_birth is not distinct from old.date_of_birth then return new; end if;
    if old.date_of_birth is not null and new.date_of_birth is null then
      raise exception 'dob_required: A saved date of birth cannot be removed.' using errcode = 'P0001';
    end if;
  end if;
  -- Nullable for legacy accounts/OAuth and existing profile-creation triggers.
  -- The auth insert trigger below guarantees DOB persistence for email signup.
  if new.date_of_birth is not null then
    if new.date_of_birth < date '1900-01-01' or new.date_of_birth > current_date then
      raise exception 'dob_required: Date of birth is invalid.' using errcode = 'P0001';
    end if;
    if extract(year from age(current_date, new.date_of_birth)) < 13 then
      raise exception 'age_verification_failed: You must be at least 13 years old.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.prayer_space_persist_signup_dob()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  dob date;
begin
  if coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email' then
    return new;
  end if;
  dob := public.prayer_space_parse_dob(new.raw_user_meta_data->>'date_of_birth');
  -- Fail the whole signup transaction rather than creating a DOB-less user.
  if dob is null or extract(year from age(current_date, dob)) < 13 then
    raise exception 'dob_required: A valid date of birth is required.' using errcode = 'P0001';
  end if;
  insert into public.profiles (id, full_name, date_of_birth, updated_at)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), dob, now())
  on conflict (id) do update
    set date_of_birth = excluded.date_of_birth
    where public.profiles.date_of_birth is null;
  if not exists (
    select 1 from public.profiles where id = new.id and date_of_birth = dob
  ) then
    raise exception 'dob_required: Required profile data was not saved.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Only our own named triggers are replaced; retain existing age checks and
-- profile provisioning side effects. zz runs after conventional auth triggers.
drop trigger if exists prayer_space_email_dob_check on auth.users;
create trigger prayer_space_email_dob_check before insert on auth.users
for each row execute function public.prayer_space_require_email_dob();

drop trigger if exists prayer_space_profile_dob_check on public.profiles;
create trigger prayer_space_profile_dob_check before insert or update of date_of_birth on public.profiles
for each row execute function public.prayer_space_guard_profile_dob();

drop trigger if exists zz_prayer_space_signup_dob on auth.users;
create trigger zz_prayer_space_signup_dob after insert on auth.users
for each row execute function public.prayer_space_persist_signup_dob();

-- Repair only missing profile dates backed by valid, adult-enough metadata.
-- Never overwrite a saved date or trust the user-editable age_verified flag.
update public.profiles p
set date_of_birth = public.prayer_space_parse_dob(u.raw_user_meta_data->>'date_of_birth')
from auth.users u
where p.id = u.id and p.date_of_birth is null
  and coalesce(u.raw_app_meta_data->>'provider', 'email') = 'email'
  and public.prayer_space_parse_dob(u.raw_user_meta_data->>'date_of_birth') <= current_date
  and extract(year from age(current_date,
    public.prayer_space_parse_dob(u.raw_user_meta_data->>'date_of_birth'))) >= 13;

revoke all on function public.prayer_space_parse_dob(text) from public, anon, authenticated;
revoke all on function public.prayer_space_require_email_dob() from public, anon, authenticated;
revoke all on function public.prayer_space_guard_profile_dob() from public, anon, authenticated;
revoke all on function public.prayer_space_persist_signup_dob() from public, anon, authenticated;
-- Profile guard executes as the caller; allow only the non-sensitive parser.
grant execute on function public.prayer_space_parse_dob(text) to authenticated;

-- Table-wide SELECT would include the new private column. Preserve existing
-- public profile reads with explicit column grants, excluding only DOB.
revoke select on public.profiles from public, anon, authenticated;
revoke select (date_of_birth) on public.profiles from public, anon, authenticated;
do $$
declare
  safe_columns text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
  into safe_columns
  from pg_attribute
  where attrelid = 'public.profiles'::regclass and attnum > 0
    and not attisdropped and attname <> 'date_of_birth';
  execute 'grant select (' || safe_columns || ') on public.profiles to anon, authenticated';
  if has_column_privilege('anon', 'public.profiles', 'date_of_birth', 'SELECT')
    or has_column_privilege('authenticated', 'public.profiles', 'date_of_birth', 'SELECT')
  then
    raise exception 'DOB remains readable through inherited permissions; review grants before applying';
  end if;
end;
$$;

create or replace function public.get_my_registration_profile()
returns table (
  id uuid, full_name text, avatar_url text, bio text, favorite_verse text,
  date_of_birth date, updated_at timestamptz, deletion_requested_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, p.avatar_url, p.bio, p.favorite_verse,
    p.date_of_birth, p.updated_at, p.deletion_requested_at
  from public.profiles p
  where p.id = auth.uid() and auth.uid() is not null;
$$;
revoke all on function public.get_my_registration_profile() from public, anon, authenticated;
grant execute on function public.get_my_registration_profile() to authenticated;

create or replace function public.registration_profile_storage_ready()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'public.profiles'::regclass and attname = 'date_of_birth'
      and atttypid = 'date'::regtype and not attisdropped
  ) and exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'auth.users'::regclass and tgname = 'zz_prayer_space_signup_dob'
      and tgenabled = 'O'
  );
$$;
revoke all on function public.registration_profile_storage_ready() from public, anon, authenticated;
grant execute on function public.registration_profile_storage_ready() to anon, authenticated;

notify pgrst, 'reload schema';
commit;
