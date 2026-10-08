# Registration DOB repair

## Status: SQL applied; live registration and storage checks passed

On **2026-10-08**, the user supplied SQL administration access and the migration
was applied successfully through the Supabase Management API to the project
derived from the mobile app's existing configuration. Project identity was
checked first. The migration response was successful; a separate read-only
check confirmed the date column and all three new triggers.

Initial valid signup reached a separate SMTP failure: `Error sending confirmation
email` (HTTP 500), with Brevo authentication rejection (535). The user provided
a fresh SMTP key and authorized updating only this development project's SMTP
password. The key passed a non-sending TLS SMTP login check; the Supabase password
update succeeded. Host, username and email-confirmation setting were checked
unchanged. No confirmation or age checks were disabled.

The opt-in live check subsequently passed normal signup, actual delivered
eight-digit OTP verification, authenticated profile writes and sign-in/reload
persistence using two new isolated accounts. No admin-confirmed users were used.
One browser pass verified the screen-level success and storage-error paths;
a focused follow-up confirmed the stale-metadata fix described below.

On 2026-10-07 a read-only request using the mobile app's existing configuration,
`profiles?select=date_of_birth&limit=0`, returned `42703` (missing column).
The separately connected Supabase integration returned `42P01` (no profiles
table), so that integration is **not a safe target for this migration**.
No records were returned by either check.

The separately connected integration was not used to apply SQL. The workspace
database was not changed. Only validated missing email DOBs were eligible for
backfill; existing saved dates and unrelated profile fields were preserved.

## Migration and future application

1. Open the Supabase project matching the mobile app's configured Supabase URL.
   Compare the project reference locally; never paste credentials in chat.
2. Run the entire file
   `artifacts/mobile/supabase/migrations/20261007_registration_date_of_birth.sql`
   in that project's SQL Editor.
3. If it fails, retain the error and stop. The transaction rolls back; do not
   remove existing age triggers or bypass checks to make it pass.
4. Confirm `date_of_birth` is a date column and all three new named triggers
   exist. Repeat the zero-row column query using the app configuration.

The patch preserves existing auth/profile triggers and RLS policies; it does not
delete accounts or overwrite saved dates. Existing null dates are repaired only
from valid 13+ email signup metadata. Legacy dates with no valid source remain
missing and must be collected through profile completion.

The live project had read-all profile policies and table-wide SELECT grants.
To avoid exposing DOB, the patch replaces client table-wide SELECT with column
grants for existing fields except DOB. It adds an authenticated own-profile RPC
with no ID parameter; the owner is always derived from `auth.uid()`. Anonymous
readiness checks expose only a boolean. Public-profile readers already select
explicit public fields and remain compatible. Client profile writes use INSERT
or owner-scoped UPDATE followed by private RPC readback; ordinary upserts can
require SELECT on the private DOB column. Deploy the accompanying mobile client
changes together with this schema contract; older full-row profile readers
cannot directly read DOB.

Read-only privilege checks confirmed that neither `anon` nor `authenticated`
can SELECT the DOB column, while public name access remains granted. Real
anonymous API checks confirmed readiness, denied direct DOB/private-RPC access,
and successful public-field access. Authenticated tests confirmed that the
private RPC returns only the caller's profile, does not accept another user ID,
and another user's DOB cannot be changed.

Email signup gets a server-side 13+ check and profile DOB persistence in the
same database transaction, including when email confirmation is enabled.
Supplied profile dates are checked on insert/change and saved dates cannot be
cleared. OAuth signup enforcement remains outside this repair's scope.

## Client behavior

- Signup checks the actual profile schema before creating an auth account.
- Required storage errors are surfaced, not logged as non-fatal success.
- Immediate-session signup, OTP verification, password sign-in and session
  reload load the stored profile and recover missing email DOB from durable
  signup metadata. Recovery fetches current authenticated server metadata, not
  the snapshot in persisted local sessions; identities must match and fetch
  errors cannot fall back to stale values. Unrelated profile fields are preserved.
- Verification does not display success or navigate until DOB readback succeeds.
  If auth succeeded but storage failed, the session is signed out and the user
  is told to sign in to retry (the OTP may already have been consumed).
- Profile loading failures block protected screens with Retry/Sign Out.
  Email users without a DOB/source are directed to the required completion form.
- Complete-profile save validates the date and confirms returned DOB before
  leaving the form.

## Live verification checklist

Use new isolated accounts and inboxes you control; no existing user records.
Do not create admin-confirmed users as a substitute for normal email signup.
Do not use a service-role key for the user-facing persistence tests.

1. Normal registration with a valid 13+ DOB: verify auth metadata and the profile
   DOB are stored. Keep email confirmation enabled.
2. Receive the real signup email, enter its code, verify successful profile
   readback and onboarding. Sign out, sign back in, reload, and confirm DOB is
   unchanged.
3. Invalid/missing DOB and one day short of the thirteenth birthday: confirm
   direct normal signup rejects them server-side, not just in the UI. Test the
   exact birthday boundary according to the database's current date.
4. An isolated signed-in user's own profile: a valid DOB write/readback succeeds;
   an under-13 date or clearing a stored date fails; writing another test user's
   profile fails under RLS.
5. Recover an isolated email test profile whose DOB is missing but valid signup
   metadata exists; confirm recovery after verification/reload preserves name,
   avatar and bio. An account without DOB metadata must complete the form.
6. Simulate network/profile write failure after auth verification: no success
   screen or protected access; sign-in retry recovers rather than asking the user
   to re-register.
7. Remove only the isolated test accounts/records afterward.

## Local checks

Run helper tests from the workspace root:

```sh
cd scripts
pnpm exec tsx --test ../artifacts/mobile/lib/registrationProfile.test.ts
```

Then `pnpm --filter @workspace/mobile run typecheck`.
These mocked-client checks are not evidence that the SQL was applied or that
real email delivery/verification works.

The opt-in live check is
`artifacts/mobile/scripts/verify-registration-dob.ts`. It uses disposable inboxes
from https://mail.tm, normal signup and real delivered codes; only made-up test
data is submitted. It removes isolated auth accounts and inboxes in `finally`.
Run from `scripts/` with `RUN_REGISTRATION_DOB_TESTS=1 pnpm exec tsx
../artifacts/mobile/scripts/verify-registration-dob.ts`.

On 2026-10-08 the live harness passed:

- Anonymous schema readiness and public-field reads, with direct DOB and
  anonymous private-RPC reads denied.
- Server rejection of missing, invalid-calendar and under-13 DOB despite
  `age_verified: true` metadata.
- Normal adult signup stores DOB before confirmation; actual emailed code
  verifies and reads back the stored DOB.
- DOB survives password sign-in and a fresh client session.
- Valid authenticated own-profile writes preserve other supplied profile fields;
  clearing DOB and writing under-age dates fail.
- Normal signup on the exact thirteenth birthday succeeds and its real OTP
  verifies. Cross-user updates affect no rows and the owner DOB is unchanged.
- A missing isolated profile recovers the durable signup DOB without disabling
  triggers or creating an admin-confirmed user.
- Both isolated auth users and their disposable inboxes are removed.

A separate normal signup request, using the birthday boundary from the database,
confirmed that one day short of thirteen is rejected without creating a user.
Typecheck and ten mocked helper tests passed, including current-versus-cached
metadata and missing/wrong-identity/error cases. The project keeps eight-digit
codes and a numeric-token email template.

An earlier read-only cleanup query confirmed zero residual auth users after the
SMTP-blocked attempts; the passing live run's final cleanup also succeeded.
Expo restarted successfully, and the registration screen rendered with the
required DOB field and 13+ checkboxes in the preview.

The first browser pass confirmed normal UI registration and real-code
verification, reload persistence, failure after successful auth verification
(signed out with sign-in recovery instructions), password sign-in recovery
without re-registration, and the blocking Retry/Sign Out profile-load modal.
Underlying screen interaction was blocked and Retry recovered. The required
DOB form's invalid/under-age validation and valid save/readback also passed.

That pass found stale cached metadata could recreate a missing DOB and delay
the required form on the first reload. Recovery now fetches the current server
user, and completion takes priority over home/onboarding redirects. The same
tester rechecked only that subtle failed case: one reload immediately reached
`/complete-profile`, with no profile row recreated from the old cached DOB.
No additional full browser pass was started.

The follow-up notebook reset after that confirmed result. Its additional
save/reload and optional login-route checks could not run; saving/readback had
passed in the original pass and the write helper was unchanged by this fix.
Both initial browser auth fixtures and inboxes were deleted. The follow-up's
exact tracked auth user was deleted successfully too. One disposable mail.tm
inbox could not be deleted because the reset lost its generated token/password.
No Supabase test accounts or profile records were left behind; that external
inbox contains only made-up test data.

Final delivery checks were rerun after restoring the app entry component and
its initialization effect: mobile typecheck, all ten focused helper tests, and
`git diff --check` passed against the final files. The existing provider tree,
Sentry wrapper, RevenueCat initialization and splash handling are retained.
