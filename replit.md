# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- **mobile** (`artifacts/mobile/`) — Prayer Space, an Expo (React Native) mobile app imported from https://github.com/BetaONEIO/prayerspace. Uses Supabase for auth/storage/chat (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Optional secrets: `EXPO_PUBLIC_TOOLKIT_URL` and `EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY` for AI transcription/text generation features.
  - **`EXPO_PUBLIC_SUPABASE_URL` must be the bare project URL** (e.g. `https://<ref>.supabase.co`) — NOT the REST endpoint. If a path like `/rest/v1/` is included, supabase-js builds malformed auth URLs and every call fails with `Invalid path specified in request URL`. `lib/supabase.ts` defensively strips any path/trailing slash and logs a warning, but the secret should still be cleaned up.
  - **Email OTP registration setup (one-time, in Supabase Dashboard):**
    1. Authentication → Providers → Email: keep "Confirm email" enabled.
    2. Authentication → Email Templates → Confirm signup: edit the body to include the 6-digit token, e.g. `Your Prayer Space verification code is {{ .Token }}`. Without this, the email will only contain the magic link and the OTP screen will reject every code.
    3. **Age verification (13+) — run the SQL block in `artifacts/mobile/lib/supabase.ts`:**
       - Adds `date_of_birth date` column to `public.profiles` (and updates `handle_new_user` to copy it from signup metadata).
       - Installs a `before insert on auth.users` trigger (`enforce_min_signup_age`) that **unconditionally requires** a valid `raw_user_meta_data.date_of_birth` for email signups and rejects users younger than 13. The mobile signup form sends the DOB in metadata; this trigger is the authoritative server-side check that cannot be bypassed by client tampering.
       - The trigger skips enforcement for OAuth providers (e.g. Google) because their flow does not include DOB at signup — DOB still needs to be collected for those users in a post-signup completion screen (not yet implemented).
       - If you add an admin user-creation endpoint using the service role, it must include `date_of_birth` in `user_metadata` for the trigger to accept it. The current admin route (`/api/admin/delete-users`) only deletes users, so it is unaffected.
    5. **Prayer requests (date-based reminders) — run the new SQL block in `artifacts/mobile/lib/supabase.ts`:**
       - Creates `prayer_requests` table with `event_date`, `event_time`, `has_prayer_date` (generated), `reminder_sent`, `follow_up_prompt_shown`, `status` (ongoing/answered/still_need_prayer/archived), `prayer_count` fields.
       - Creates `prayer_engagements` table tracking who prayed for each request, with a trigger that auto-increments/decrements `prayer_count` on `prayer_requests`.
       - Creates `prayer_request_updates` table for follow-up posts tied to a specific `follow_up_option`.
       - Adds an index on `event_date WHERE reminder_sent = false AND status = 'ongoing'` for efficient reminder queries.
       - See `artifacts/mobile/lib/prayerReminders.ts` for the notification stub with full instructions on integrating `expo-notifications` for push scheduling.
       - `artifacts/mobile/mocks/data.ts` — `ReceivedPrayerRequest` and `PrayerRequest` interfaces now include `eventDate`, `eventTime`, `hasPrayerDate`, `reminderSent`, `followUpPromptShown`, `status` fields. Two sample requests have upcoming dates so the feed display can be tested.
    6. (Production only) Authentication → SMTP Settings: configure custom SMTP.
       - Brevo host: `smtp-relay.brevo.com`
       - Port: `587`
       - Username: `892523002@smtp-brevo.com`
       - From email: `hello@prayerspace.app`
       - Use the Brevo SMTP password from secrets
       Supabase's built-in mailer is rate-limited to a few emails per hour and is meant for development.
       If no email arrives and no Brevo log appears, the signup email is still being handled by Supabase's default mailer or the template is not set to OTP mode.
- **api-server** (`artifacts/api-server/`) — shared Express API at `/api`.
- **mockup-sandbox** (`artifacts/mockup-sandbox/`) — design canvas for prototyping.
