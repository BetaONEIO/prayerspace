# Community discovery repair

## Status

The discovery catalogue migration has been **applied** through the Supabase
Management API to the project derived from the mobile app's existing
configuration. The Management API project identity was checked against that
configuration first. The separately connected REST integration was not used.

An administrative catalogue check confirmed there were no existing community,
church or group tables to reuse. Existing user and prayer data were not changed.
No sample communities were added.

## Database

Migration: `artifacts/mobile/supabase/migrations/20261008_community_discovery.sql`

- Adds the fields requested by the app's discovery hook.
- Indexes public communities for official-first/member-count ordering.
- Enables row-level security and permits anonymous/authenticated reads of
  public catalogue fields only.
- Private communities are excluded at the database boundary, not only by the UI.
- Client inserts, updates and deletes are denied. Clients cannot grant official
  status or manufacture membership counts.
- Only trusted administrative/service operations can maintain this catalogue.
- Refreshes PostgREST's schema cache.

## App behavior

Both inline discovery and the browse modal show actual loading errors and a
Retry button, including when no results have ever loaded. Missing tables no
longer silently become empty results. The modal refetches when opened.

Search values are quoted to protect PostgREST filter syntax when names contain
commas, parentheses or quotation marks. Literal percent/underscore searches are
escaped. Superseded or unmounted requests are aborted and cannot replace newer
results. Equal-ranked records have a stable ID ordering.

## Verification

Run the non-mutating schema and REST checks with:

```sh
node artifacts/mobile/scripts/verify-community-discovery.cjs
```

The applied migration and transactional security test ran successfully with:

```sh
COMMUNITY_DISCOVERY_DEV_PROJECT_CONFIRMED=yes \
  node artifacts/mobile/scripts/verify-community-discovery.cjs --apply --verify-rls
```

`--apply` deliberately refuses to run if the catalogue already exists; do not
use that flag again on this project. To repeat the security test, use only
`--verify-rls`. It creates two transaction-local fixtures and always rolls back
on success; a failed transaction also rolls back rather than leaving fixtures.

Checks passed:

- All nine discovery fields available.
- Public records readable and private records hidden for **both** anonymous and
  authenticated database roles.
- Search/filter/order behavior on isolated transaction-local rows.
- Insert/update/delete denied for both client roles.
- Test fixtures absent after rollback.
- Exact anonymous REST discovery request and ordinary/special-character search
  requests returned HTTP 200 and public-only results.
- Mobile TypeScript and whitespace checks passed.

This verification uses API and database checks, not a new signed-in browser or
native-device test.

## Remaining scope

This repair makes discovery read real, persisted catalogue records. It does
**not** implement community creation, membership, invite-code joining, group
chat or billing authorization. Existing church onboarding/community ownership
is still local app state and does not publish catalogue rows. Do not backfill
that state as trusted membership or paid access.

Until real communities are published through a trusted creation flow, an empty
discovery list is expected—not a loading failure.
