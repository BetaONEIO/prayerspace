# Prayer Space app test report

## Scope and result

Tested the running development Expo web app at a mobile viewport of 402 × 874,
plus read-only backend/schema checks and TypeScript checks. This was a browser
smoke test, not complete iOS/Android certification or an exhaustive test of all
features.

**Result:** Existing email users can sign in and navigate the tested screens.
There are confirmed live-schema gaps and release-blocking billing risks.
No app fixes, schema migrations, store changes, or real purchases were made.

Two temporary development auth users were created sequentially: the initial
DOB-bearing profile fixture failed and was cleaned; a replacement existing-email
fixture using only supported profile fields enabled signed-in testing and was
also cleaned. No existing users' data was changed. No prayer, message, community,
or purchase was submitted, and temporary credential files were removed.

## Highest-priority findings

### 1. Required date-of-birth profile storage fails — confirmed live schema defect

- Registration asks for DOB and the app writes `profiles.date_of_birth`.
- A test DOB profile write returned `PGRST204`. A separate read-only field
  query returned `42703: column profiles.date_of_birth does not exist`.
- Registration code can treat profile-write errors as non-fatal, so this does
  **not** prove all auth account creation is blocked. It proves required DOB
  cannot be saved to the profile using the current schema.
- Existing confirmed email accounts without that field could still sign in.
- Relevant code: `artifacts/mobile/providers/AuthProvider.tsx`,
  `artifacts/mobile/app/register.tsx`.
- Needed: align the development database with required profile fields and verify
  real signup/verification/profile persistence without silently ignoring failure.
  An end-to-end signup/OTP delivery test was not performed.

### 2. Community discovery cannot load its source table — confirmed API failure

- Repro: sign in → Community → community discovery.
- The browser showed loading and resource 404s, then no community cards or
  useful explanation. The original browser capture did not identify the exact
  failing request URL.
- A separate query matching the discovery hook's columns returned `PGRST205:
  Could not find the table 'public.communities' in the schema cache`.
- This proves the table is unavailable to PostgREST; without SQL administration
  it is not an inventory of the physical database.
- The UI either suppresses missing-table errors or renders generic discovery
  text instead of an actionable error.
- Relevant code: `artifacts/mobile/lib/useDiscoverCommunities.ts`,
  `artifacts/mobile/app/(tabs)/community.tsx`.
- Needed: confirm/apply the correct community schema and permissions; distinguish
  failed loading from an empty community list and offer retry.

### 3. Cancel request and unblock operations are unavailable — confirmed live API gap

- Read-only live OpenAPI inspection found send, respond, remove, and block RPCs.
- `cancel_friend_request` and `unblock_user` remain absent.
- The earlier guarded three-account database journey failed at cancellation.
  That journey was not repeated during this smoke test.
- Request-list screens rendered correctly for the new account, but no friend
  request was sent in this browser run.
- Needed: apply and verify the missing RPCs securely in the confirmed development
  project. See `docs/friends-connections-audit.md` and the prepared
  `artifacts/mobile/supabase/migrations/20260926_missing_friend_rpcs.sql`.

## Billing risks — confirmed code findings, purchase behavior not exercised

The browser rendered Personal Pro and community plan screens; it did not buy,
restore, cancel, or expire a subscription.

- The community paywall proceeds into paid onboarding when the package is missing.
- Community restore marks paid ownership without checking an active entitlement.
- Empty active entitlements do not downgrade a paid owner in the local
  entitlement hook.
- Personal Pro reads the current offering. The prior read-only RevenueCat audit
  found community packages current and personal packages in `default`, so the
  Personal Pro screen's prices can be hard-coded fallbacks rather than
  purchasable packages.
- Personal purchase confirmation always claims a seven-day free trial without
  checking actual store configuration/eligibility.
- RevenueCat customer identity is not tied to Supabase login/logout.
- Paid-community ownership/access is local rather than trusted backend state.
- The prior live audit also found RevenueCat store identifiers different from
  the app's build identifiers; the correct store listing remains unconfirmed.

These findings remain launch blockers until fixed and tested. They were not
reported as successful payment tests. See `docs/revenuecat-live-readiness.md`
for store configuration details.

## Backend checks

| Check | Result |
| --- | --- |
| Expo status endpoint | HTTP 200 |
| API `/api/healthz` | HTTP 200, `status: ok` |
| Supabase Auth health | HTTP 200 |
| Supabase OpenAPI schema | HTTP 200 |
| Mobile TypeScript check | Passed |
| Scripts TypeScript check | Passed |
| API-server TypeScript check | Failed: 5 errors |

API errors: four typing errors in `artifacts/api-server/src/routes/admin.ts`
and one Buffer type incompatibility in
`artifacts/api-server/src/routes/transcribe.ts`. The development server is still
running and responding; these typecheck failures alone do not prove either
endpoint fails at runtime. Neither administrative deletion nor transcription
was invoked.

## Browser checks that passed

- Root loaded and reached Login. Empty sign-in displayed “Missing Fields —
  Please enter your email and password.”
- Existing confirmed email user signed in through the real UI.
- The session survived reload; Home rendered after a brief settle.
- Home and Community Feed rendered first-user empty states.
- Prayer compose opened; empty Confirm did not submit a prayer.
- Find Friends, Friends, Incoming Requests, and Sent Requests rendered their
  respective empty states.
- My Prayer Groups and Community Groups rendered their empty states.
- Settings and Edit Profile rendered without a crash or persistent spinner.
- Personal Pro and community plan screens rendered without showing purchased
  access. No purchase or restore controls were used.
- Sign-out returned to Login.

Empty-state rendering is not proof of populated lists, create/edit/delete flows,
or server-side authorization beyond the separate checks described above.

## Lower-priority observations

- Intermittent Community menu/back hit targets were intercepted by stacked
  views; selecting Home restored navigation. Needs a focused reproduction.
- The community plan screen displayed a pound-denominated free tier alongside
  dollar-denominated paid tiers in the browser's Test Store environment.
- Browser diagnostics included a 406 during initial loading, a 400 around
  sign-out, CSP inline-style refusals, and aborted remote MP4 loads. The relevant
  requests were not fully identified; do not assign a cause without further
  evidence. The tested screens and sign-out nevertheless completed.
- Immediate captures after reload were sometimes blank, but settled content
  appeared. The earlier blank screenshots do not establish a permanent launch
  failure.
- Expo logs warn about package-version compatibility and deprecated AV APIs;
  these are warnings, not verified native failures.

## Not verified

Google/Apple OAuth, OTP/reset-email delivery, populated friends and chat,
new prayer saving/editing/deleting, group/community create/join, native keyboard
and tab-bar behavior, contacts, microphone/recording/playback, reminders and push
notifications, real store purchase/restore, trial eligibility, subscription
expiry/refunds, and paid-access authorization on native devices.

## Recommended order

1. Resolve required profile and community schema gaps.
2. Restore cancellation/unblock RPCs and finish the existing friendship test.
3. Repair paid-access validation and product/identity wiring before real billing.
4. Fix backend type errors, then test transcription and affected admin behavior.
5. Validate the remaining native and data-writing journeys with isolated test
   records; never treat this browser smoke test as an all-features pass.
