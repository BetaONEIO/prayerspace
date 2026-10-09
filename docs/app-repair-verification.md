# Prayer Space repair verification

## Implemented and checked

- The former public bulk-deletion route returns HTTP 410 and has no service-role deletion implementation.
- Transcription requires a Supabase-authenticated session. Invalid encoding and unsupported MIME types are rejected; audio is limited to 8 MB and JSON to 12 MB. Conversion and provider calls have timeouts, and authenticated work has per-process usage/concurrency limits.
- Direct-message creation is an authenticated, accepted-friends-only RPC. Database policies restrict chat reads to participants, prevent self-enrolment and sender impersonation, enforce blocked-send restrictions and edit/delete deadlines, and protect reactions.
- Cancellation and unblock RPCs are applied to the app-configured database.
- Free community creation and public joining persist real ownership and membership in the database. Creation saves description, location and denomination. Joining is idempotent; private communities reject uninvited joins. Old local ownership claims were not imported.
- Received-prayer details load real records under row-level access rules; anonymous requests do not expose sender identity through the detail response.
- Purchases are tied to the signed-in Supabase user. Missing packages and empty/inactive restores do not grant paid access. Personal and community offerings are selected explicitly, with actual package prices and no unconditional free-trial or nonexistent-discount claims.
- Personal and community subscription status is checked server-side against RevenueCat. Checking a particular community also requires membership and verifies its actual owner's entitlement. Production additionally requires an active App Store/Play Store subscription carrying the exact entitlement, with its product belonging to an explicitly verified RevenueCat app.

## Evidence

- Mobile and backend TypeScript checks passed, as did shared API code generation and whitespace validation.
- Three isolated authenticated accounts exercised friendship requests, acceptance, decline, cancellation, blocking and unblocking, protected chat creation/read/write/reactions, durable community membership, and received-prayer anonymity.
- Protected endpoint checks verified HTTP 410 for retired deletion, HTTP 401 for unauthenticated requests, HTTP 400 for malformed audio/arguments, HTTP 413 for oversized audio, inactive subscription results for unpaid fixtures, and HTTP 403 for a non-member.
- A browser pass created a free community through onboarding and confirmed it survives reload. A separate authenticated request against the app-configured Supabase project confirmed its persisted ownership, description, location and member count.
- The browser displayed a real anonymous received-prayer request and sent/reloaded a real chat message. Personal Pro displayed personal packages and “Subscribe to Pro.”
- Temporary accounts, communities, chat messages, reactions, prayer requests and associated relationship/notification records were removed after verification. No existing user records were deliberately deleted or reconstructed.

## Re-running checks

From the workspace root:

```sh
pnpm --filter @workspace/mobile run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/mobile/lib/billingEntitlements.test.ts
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/api-server/src/lib/subscriptionTrust.test.ts
```

The integration commands create and delete temporary records. Run only against a confirmed development project:

```sh
FRIEND_TEST_DEV_PROJECT_CONFIRMED=yes node artifacts/mobile/scripts/verify-friend-requests.cjs --keep-ui-fixtures
API_TEST_DEV_PROJECT_CONFIRMED=yes node artifacts/api-server/scripts/verify-protected-endpoints.cjs
FRIEND_TEST_DEV_PROJECT_CONFIRMED=yes node artifacts/mobile/scripts/verify-friend-requests.cjs --cleanup-fixtures
```

The temporary credential file is kept under `/tmp` with owner-only permissions. Never commit it or display its contents. If UI tests create extra fixture-owned communities, cleanup removes those too.

## Release boundaries

- Live Apple/Google listing identity remains unconfirmed. Store identifiers and product catalogues were not changed. No real checkout, live-store purchase, native restore or cancellation/expiry lifecycle was certified. After confirming the real listings and corresponding RevenueCat apps, configure `REVENUECAT_VERIFIED_STORE_APP_IDS` through workspace environment settings as a comma-separated allowlist of RevenueCat app IDs (not bundle/package names). Do not populate it from unverified legacy apps. Production paid access fails closed until this is configured; development can still use the Test Store.
- Native voice recording, notification/reminder behavior and Expo package compatibility still require device verification; browser checks do not certify these.
- Historical conversation memberships are preserved rather than guessed or deleted. Their original authorization cannot be inferred merely from the new participant policies.
- Current transcription counters are in-process, not a durable cross-instance spending budget.
- Database migrations are applied to the app-configured Supabase project, not the separate bound REST connector. Confirm this identity before any future migration or test.
- No publishing was performed. Backend and native app updates must be released together where older builds still use direct chat creation instead of the new RPC.
