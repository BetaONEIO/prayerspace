# Friends and Connections Audit

## Audit status

The client-side relationship flow has been improved, but the audit is **not
complete until the Supabase migration is applied and the A/B/C test journey is
run with three genuine accounts**. The workspace does not contain a migration
runner or a connected multi-account test session, so those deployment and
end-to-end checks remain explicit release blockers.

## What was already working

- Friend requests were stored in Supabase in `friend_requests`.
- Accepted requests were interpreted bidirectionally by the feed and activity
  queries.
- Incoming requests had a real Supabase-backed list with accept and decline
  actions.
- Search results and address-book matches were sourced from Supabase profile
  rows rather than a local friend list.
- Feed rows retained real author IDs for non-anonymous posts.
- Prayer feed queries already separated public and friends audiences at the
  client query level.
- Chat had a persisted `blocked_users` table and a chat-level block toggle.

## Problems found

- The only relationship table was directional `friend_requests`; it had a
  same-direction unique constraint but allowed reverse-direction duplicates,
  self-requests, and client-side check-then-insert races.
- Declined requests could remain in the table while the client tried to insert
  a second row instead of safely reusing the existing relationship.
- The friend-only prayer RLS policy was only present in a commented SQL recipe.
  The active documented policy covered public prayers, not confirmed friends.
- Profile pages had no real Add Friend, Request Sent, Respond, Friends,
  Remove Friend, or Block state.
- There was no real Friends list or unfriend flow.
- Friend request notifications were local in-memory state; requests and
  acceptances did not create durable notifications.
- Blocking was scoped to chat and was not enforced against friend requests,
  feed visibility, or message creation. The Activity block action was a
  no-op.
- Profile activity was a hard-coded empty state rather than an authorized
  activity query.
- Status audience selection was not passed through to persistence; the
  community submit path forced non-anonymous posts to `friends` and anonymous
  posts to `everyone`. This is fixed in the current client changes.
- Anonymous posts still selected the underlying `author_id` and fetched its
  profile before mapping the UI label to Anonymous.
- Several unrelated production paths still import mock contacts/messages or
  use hard-coded avatars. These must not be used as evidence for real
  friendship testing.
- Conversation creation, participant insertion, message editing, and message
  deletion still rely on table policies that do not fully enforce friendship,
  block state, participant integrity, or time limits at the database boundary.
- Feed, profile activity, and search use fixed result limits rather than
  cursor-based pagination.
- Deleted/deactivated account and deleted-content behavior is not consistently
  represented with safe tombstones.

## Fixes made in this audit

### Server-side relationship migration

Added:

`artifacts/mobile/supabase/migrations/20260827_friends_connections_security.sql`

The migration:

- rejects self-requests;
- detects duplicate active unordered pairs and stops safely rather than
  deleting relationship history;
- adds a unique active relationship index across both directions;
- adds atomic security-definer RPCs for sending, responding, cancelling,
  removing, blocking, and unblocking;
- prevents direct relationship mutations from bypassing those RPCs;
- makes blocks readable only to involved users and mutable only through the
  block RPCs;
- adds durable friend-request and accepted-request notifications;
- resolves pending-request notifications on acceptance, decline, cancellation,
  unfriend, and block;
- excludes blocked actors from durable notification reads;
- adds block-aware public, friends-only, and private prayer SELECT policies;
- applies the same parent-prayer visibility rules to prayer updates.
- publishes friendship changes to Supabase Realtime when the publication is
  available.

The duplicate-pair preflight is intentionally fail-safe. Existing duplicate
active rows need manual review before the migration can be applied.

### Client relationship flow

- `find-friend.tsx` now calls `send_friend_request` instead of doing an
  insecure client-side precheck followed by a direct insert.
- `friend-requests.tsx` now calls `respond_to_friend_request` and refreshes
  related request/feed caches.
- `user/[id].tsx` now derives relationship state from real request/block rows
  and supports Add Friend, Request Sent, Respond, Friends/Remove Friend, and
  Blocked states.
- Added `app/friends.tsx`, a real accepted-friend list linked to each user’s
  profile and with an empty state.
- Added `app/sent-friend-requests.tsx`, with real pending outgoing requests,
  profile links, loading/error/empty states, and RPC-backed cancellation.
- Find Friends now links to the real Friends list.
- Non-interactive search/address-book rows for existing friends and pending
  requests are no longer rendered as dead rows. Declined requests remain
  retryable.
- Incoming request rows now link to sender profiles, expose retryable query
  errors, and link to Sent Requests.
- Relationship mutations invalidate Friends, request, relationship, and feed
  caches so screens do not retain stale accepted/removed states.
- Status creation now persists the exact selected `everyone`, `friends`, or
  `private` audience. Unsupported local-only community audiences are no longer
  silently saved as friend/public posts.
- Feed realtime handling now covers insert, update, and delete events, and
  friendship realtime events invalidate both friend IDs and feed data.
- Chat block state now checks both block directions, prevents client sends when
  either participant has blocked the other, and uses `block_user` /
  `unblock_user` rather than direct table writes.

## Database/RLS changes

The migration file contains the database changes, but it has **not been
verified as applied to the live Supabase project from this workspace**. Until
it is applied:

- the new RPC calls will not exist;
- the unique active-pair index will not protect concurrent requests;
- friends-only feed visibility is not proven server-enforced;
- durable friend notifications will not exist.
- sent-request cancellation and secure unblock actions will not work.

## Verification performed

- Ran the complete mobile TypeScript check successfully.
- Ran `git diff --check`.
- Confirmed the configured Expo workflow remains running.

## Remaining release blockers

1. Apply the migration in Supabase and resolve any duplicate active pairs
   reported by its preflight.
2. Run the complete three-account A/B/C journey against the real development
   database, including both request directions, accept, decline, unfriend,
   block, refresh, and direct-query privacy checks.
3. Add a server-side anonymous projection or RPC that never returns author
   identity to viewers of anonymous posts.
4. Enforce friendship, blocks, participant integrity, edit/delete limits, and
   delete-for-me filtering in conversation/message RPCs and policies. The
   current chat UI checks block state, but database bypasses remain possible.
5. Remove
   the mock/non-UUID chat branch from production navigation.
6. Implement authorized profile activity instead of the hard-coded empty
   state.
7. Replace fixed 20/50/100-row limits with cursor pagination and refresh
   deleted/deactivated account behavior.
8. Audit and remove remaining mock user/avatar dependencies from the broader
   social flows before release.

## Critical Friend Request follow-up (not yet complete)

The Find → Send → Receive → Accept flow has **not** been verified end-to-end.
Do not mark this audit complete or release the flow on the basis of these code
changes alone.

### Confirmed code-level failure and changes

- Incoming and sent request queries attempted embedded joins from
  `friend_requests` to `profiles` using the request foreign-key names. Those
  request IDs reference `auth.users`, not `profiles`, so the embedded joins
  cannot resolve in PostgREST. The two request screens now fetch pending rows
  by `receiver_id`/`sender_id` and `status = pending`, then fetch matching
  public profiles by ID. Query errors are shown rather than silently returning
  an empty list. This fixes a concrete receiving/display failure, but has not
  been tested against the live database.
- Find Friends previously hid users with pending/accepted relationships and
  treated an error loading relationships as "no relationship." Search now keeps
  real results visible, opens the real profile on row tap, displays the actual
  direction of pending requests, and prevents sending when relationship state
  cannot be checked. Sending only changes the displayed state after the RPC
  succeeds and the relationship query has refreshed.
- Profile relationship lookup now treats database errors as unavailable rather
  than displaying Add Friend; it re-reads the relationship after a send.
  Incoming/sent lists and Friends list refresh while open. Friends now links
  directly to Requests.
- The separately supplied `20260926_friend_notifications_best_effort.sql`
  migration makes a notification-write failure non-fatal to the request or
  response transaction. **It has not been applied to Supabase.**
- A prior auth-provider change removes a redundant initial session read and
  defers OAuth profile queries until after the auth callback returns. The
  reported token-lock crash has not been reproduced or verified fixed on the
  affected device.

### Live environment and verification

Read-only checks to the configured Supabase `/auth/v1/health` and
`/rest/v1/friend_requests` endpoints returned Cloudflare **502/521 gateway
errors** on September 26, 2026. No friend records were written, no test
accounts were created, and no live SQL/RLS policies could be inspected.
Therefore the **root cause of the reported sending failure is not established**:
the unavailable backend and an unapplied RPC migration are both plausible
blockers, not proven causes of the earlier user-reported failure.

The mobile TypeScript check and whitespace check passed. Expo restarted and
Metro served the web bundle, but its initial web screenshot was blank while
the backend was unavailable; this is **not** end-to-end runtime verification.

**Sending test:** blocked; no authenticated request could be sent.
**Receiving test:** blocked; no live pending row could be queried.
**Accept/decline/cancel tests:** blocked; no live RPC could be called.
**Multi-account A/B/C tests in both directions:** not run.
**Notification test:** not run. **RLS:** reviewed in the checked-in migration,
not verified against the live database; no live policy was changed.

Once the *development* Supabase project is reachable, apply
`20260827_friends_connections_security.sql` if absent, then
`20260926_friend_notifications_best_effort.sql`. Review the first migration's
duplicate-pair preflight before applying it. Confirm the live RPCs and policies
before running the user's complete three-account checklist, including refresh,
restart, crossed requests, blocked users, notification independence, friends
lists, and friends-visible activity. Do not use a production project for
automatically created test users.
