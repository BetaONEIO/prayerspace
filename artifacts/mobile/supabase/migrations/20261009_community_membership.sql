begin;
alter table public.communities
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists location text,
  add column if not exists denomination text;

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key(community_id,user_id)
);
create index if not exists community_members_user_idx on public.community_members(user_id);
alter table public.community_members enable row level security;

create or replace function public.is_community_member(community uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and exists(
  select 1 from public.community_members where community_id=community and user_id=auth.uid()
); $$;

create policy community_members_read on public.community_members for select to authenticated
  using(public.is_community_member(community_id));
create policy communities_member_read on public.communities for select to authenticated
  using(public.is_community_member(id));

create or replace function public.create_prayer_community(
  community_name text, community_description text default null,
  community_location text default null, community_denomination text default null
)
returns uuid language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); result uuid;
begin
  if actor is null then raise exception 'Sign in to create a community' using errcode='42501'; end if;
  if length(btrim(coalesce(community_name,''))) not between 1 and 200
    or length(community_description)>4000 or length(community_location)>200
    or length(community_denomination)>200 then
    raise exception 'Please check the community details';
  end if;
  -- The RPC cannot grant subscriptions, official status or arbitrary owners.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    actor::text||':'||lower(btrim(community_name)),0));
  select id into result from public.communities
    where owner_id=actor and lower(name)=lower(btrim(community_name))
    order by created_at,id limit 1;
  if result is null then
    insert into public.communities(name,description,location,denomination,owner_id,member_count,is_private,is_official)
      values(btrim(community_name),nullif(btrim(community_description),''),nullif(btrim(community_location),''),
        nullif(btrim(community_denomination),''),actor,1,false,false) returning id into result;
    insert into public.community_members(community_id,user_id,role) values(result,actor,'owner');
  else
    update public.communities set description=nullif(btrim(community_description),''),
      location=nullif(btrim(community_location),''),denomination=nullif(btrim(community_denomination),'')
      where id=result;
  end if;
  return result;
end $$;

create or replace function public.join_prayer_community(community uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare added integer; hidden boolean;
begin
  if auth.uid() is null then raise exception 'Sign in to join' using errcode='42501'; end if;
  select is_private into hidden from public.communities where id=community for update;
  if not found then raise exception 'Community not found'; end if;
  if public.is_community_member(community) then return; end if;
  if hidden then raise exception 'An invitation is required' using errcode='42501'; end if;
  insert into public.community_members(community_id,user_id,role)
    values(community,auth.uid(),'member') on conflict do nothing;
  get diagnostics added=row_count;
  if added>0 then update public.communities set member_count=member_count+1 where id=community; end if;
end $$;

create or replace function public.get_my_communities()
returns setof public.communities language sql stable security definer set search_path=''
as $$ select c.* from public.communities c
  join public.community_members m on m.community_id=c.id
  where m.user_id=auth.uid() order by c.created_at desc,c.id; $$;

revoke all on public.community_members from public,anon,authenticated;
grant select on public.community_members to authenticated;
grant select(owner_id,location,denomination,created_at) on public.communities to authenticated;
grant all on public.community_members to service_role;
revoke all on function public.is_community_member(uuid),
  public.create_prayer_community(text,text,text,text),public.join_prayer_community(uuid),
  public.get_my_communities() from public,anon;
grant execute on function public.is_community_member(uuid),
  public.create_prayer_community(text,text,text,text),public.join_prayer_community(uuid),
  public.get_my_communities() to authenticated;
notify pgrst,'reload schema';
commit;
