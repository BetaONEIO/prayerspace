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
  posts to `everyone`.
- Anonymous posts still selected the underlying `author_id` and fetched its
  profile before mapping the UI label to Anonymous.
- Several unrelated production paths still import mock contacts/messages or
  use hard-coded avatars. These must not be used as evidence for real
  friendship testing.

## Fixes made in this audit

### Server-side relationship migration

Added:

`artifacts/mobile/supabase/migrations/20260827_friends_connections_security.sql`

The migration:

- rejects self-requests;
- detects duplicate active unordered pairs and stops safely rather than
  deleting relationship history;
- adds a unique active relationship index across both directions;
- adds atomic security-definer RPCs for sending, responding, removing, and
  blocking;
- prevents direct relationship mutations from bypassing those RPCs;
- makes blocks readable only to involved users and manageable only by the
  blocker;
- adds durable friend-request and accepted-request notifications;
- adds public, friends-only, and private prayer SELECT policies;
- applies the same parent-prayer visibility rules to prayer updates.

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
- Find Friends now links to the real Friends list.
- Non-interactive search/address-book rows for existing friends and pending
  requests are no longer rendered as dead rows. Declined requests remain
  retryable.

## Database/RLS changes

The migration file contains the database changes, but it has **not been
verified as applied to the live Supabase project from this workspace**. Until
it is applied:

- the new RPC calls will not exist;
- the unique active-pair index will not protect concurrent requests;
- friends-only feed visibility is not proven server-enforced;
- durable friend notifications will not exist.

## Verification performed

- Restarted the Expo workflow after the client changes.
- Ran the mobile TypeScript check. No new diagnostics were reported in the
  touched Friends/profile/list/request files.
- Ran `git diff --check`.
- Confirmed the mobile workflow bundles successfully.

The full workspace typecheck still reports pre-existing errors in community
styles, Expo SDK typings, reminders, audio recording, and other unrelated
files.

## Remaining release blockers

1. Apply the migration in Supabase and resolve any duplicate active pairs
   reported by its preflight.
2. Run the complete three-account A/B/C journey against the real development
   database, including both request directions, accept, decline, unfriend,
   block, refresh, and direct-query privacy checks.
3. Replace the in-memory notification provider with the new durable
   `notifications` table and mark-read/delete operations.
4. Make status audience persistence match the selected audience and add a
   server-side anonymous projection or RPC that does not return author
   identity to viewers.
5. Enforce blocks in conversation creation/message insert policies and remove
   the mock/non-UUID chat branch from production navigation.
6. Implement authorized profile activity instead of the hard-coded empty
   state.
7. Audit and remove remaining mock user/avatar dependencies from the broader
   social flows before release.
