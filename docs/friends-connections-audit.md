# Friends and Connections Audit

## Audit status

The client-side relationship flow has been improved, and a guarded integration
check has now run against the confirmed development Supabase project with three
genuine temporary accounts. **The complete flow is not verified**: the live
database is missing the cancellation and unblock RPCs. The temporary accounts
and records were removed after each test run. Authenticated mobile UI behavior
on the affected device also remains unverified.

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

The live database is **partially configured**. The live send, respond,
remove, and block RPCs work for authenticated test users. Notification creation
and friends-only post visibility also passed the three-account checks.
`cancel_friend_request` and `unblock_user` are missing from PostgREST's schema,
returning `PGRST202`. Without SQL-level access, this workspace cannot inspect
every live policy or apply missing SQL functions. The complete migration file
must not be assumed to match what is currently deployed.

For the confirmed development project, the minimal missing-function patch is
`artifacts/mobile/supabase/migrations/20260926_missing_friend_rpcs.sql`.
Apply it through that project's Supabase SQL Editor, then rerun the guarded
integration script. The separate best-effort notification migration has **not**
been applied; test notifications worked under normal conditions, but
notification-write failure isolation is unverified.

## Verification performed

- Ran the complete mobile TypeScript check successfully.
- Ran `git diff --check`.
- Confirmed the configured Expo workflow remains running.
- Ran `FRIEND_TEST_DEV_PROJECT_CONFIRMED=yes node
  scripts/verify-friend-requests.cjs` from `artifacts/mobile` against the
  confirmed development project. It failed only when reaching the unavailable
  cancellation RPC after passing the independent checks detailed below.

## Remaining release blockers

1. Apply the narrowly scoped missing-RPC patch in the confirmed development
   Supabase SQL Editor, then rerun the entire A/B/C integration script.
   Verify cancellation, non-sender denial, and unblock after the patch; these
   have not passed. Review live SQL policies/constraints before claiming the
   entire security migration is installed.
2. Verify the authenticated mobile UI on a device: Find Friends → Send →
   Incoming/Sent → Accept/Decline/Cancel → Friends, in both directions,
   including refresh and restart. The database checks alone cannot establish
   that these screens render and navigate correctly.
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

The Find → Send → Receive → Accept database flow passed with three real
development accounts in both directions. **The complete UI journey and
cancellation have not passed.** Do not mark this audit complete or release the
full flow on the basis of the database checks alone.

### Confirmed code-level failure and changes

- Incoming and sent request queries attempted embedded joins from
  `friend_requests` to `profiles` using the request foreign-key names. Those
  request IDs reference `auth.users`, not `profiles`, so the embedded joins
  cannot resolve in PostgREST. The two request screens now fetch pending rows
  by `receiver_id`/`sender_id` and `status = pending`, then fetch matching
  public profiles by ID. Query errors are shown rather than silently returning
  an empty list. This fixes a concrete receiving/display failure; the
  separate-query approach was exercised by authenticated live database
  queries, but the screen has not been verified visually.
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

The earlier gateway errors were transient; the development project became
reachable. The script `artifacts/mobile/scripts/verify-friend-requests.cjs`
created three authenticated temporary accounts (A/B/C), performed the checks,
and cleaned up all of their records and users even when an assertion failed.
The most recent run passed:

- A finds B's actual profile, sends a request, sees it in Sent; B sees it in
  Incoming; C cannot read B's request.
- B receives a durable request notification. Dismissing it does not remove the
  request. B's acceptance creates an acceptance notification for A.
- Duplicate and crossed pending requests, non-recipient acceptance, repeat
  acceptance, and requesting an existing friend are rejected.
- A and B both read the friendship after acceptance; pending lists clear.
  Removing the friendship permits B to send A a new request, which A accepts.
  Fresh sign-ins for A and B still show the confirmed friendship.
- B can read A's friends-only post, but C cannot; A declines C's later
  request without creating a friendship.
- Two simultaneous opposing A/C sends result in exactly one pending row.
  Blocking prevents requests in either direction; self-requests and direct
  authenticated table inserts are rejected.

**Failure:** The live database reports `PGRST202` for
`cancel_friend_request`. The non-sender-denial and sender-cancellation checks
cannot pass until the function exists. A read-only capability check also found
`unblock_user` absent, so unblock is not verified. The script's failure is
intentional, not a successful overall result.

The observed authenticated reads prove the tested privacy cases, but do not
constitute an inventory of every live RLS policy. The checked-in
`20260926_friend_notifications_best_effort.sql` is unapplied; the happy-path
notification checks do not prove write-failure isolation. A prior web screenshot
was blank, so these DB results must not be described as a verified mobile UI
run. The earlier reported token-lock crash has not been reproduced on its
affected device.

**Next:** In the same confirmed development Supabase project, apply
`20260926_missing_friend_rpcs.sql` using Supabase SQL Editor. Then rerun the
guarded script from `artifacts/mobile`. Separately inspect live policies and
apply `20260926_friend_notifications_best_effort.sql` if notification
failure isolation is desired. Finally validate the complete screen-level
journey with the three real users on a supported device before declaring it
complete. Never run the temporary-account script against production.
