-- Public discovery catalogue only. No sample rows or paid-access grants.
-- Ownership, membership and invite-code writes require separate trusted flows.
begin;

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  description text check (length(description) <= 4000),
  member_count integer not null default 0 check (member_count >= 0),
  is_official boolean not null default false,
  is_private boolean not null default false,
  accent_color text,
  icon_letter text,
  banner_image text,
  created_at timestamptz not null default now()
);

create index if not exists communities_public_discovery_idx
  on public.communities (is_official desc, member_count desc, id)
  where is_private = false;

alter table public.communities enable row level security;

drop policy if exists communities_public_discovery on public.communities;
create policy communities_public_discovery on public.communities
  for select to anon, authenticated using (is_private = false);

-- Only safe catalogue fields are exposed. Clients cannot insert, edit counts,
-- label themselves official, change privacy or delete communities.
revoke all on public.communities from public, anon, authenticated;
grant select (
  id, name, description, member_count, is_official, is_private,
  accent_color, icon_letter, banner_image
) on public.communities to anon, authenticated;
grant all on public.communities to service_role;

notify pgrst, 'reload schema';
commit;
