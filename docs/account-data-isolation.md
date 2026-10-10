# Account-local data isolation

## Scope

This repair addresses the cross-account local-data blocker from the readiness audit. It does not complete the other App Store blockers or certify a native release.

- Prayers, journal, settings, stats, reminders, archives, people and favourites use account-specific local storage and query identities.
- The auth callback updates the private-data identity before React renders. Account transitions remount private providers and screens together, clearing drafts, recipient selections and notification state.
- Obsolete reads/saves cannot complete into a new account, including rapid A → B → A transitions. Already-started native writes can finish only under their original account's key.
- Reads and writes are ordered by account/resource, avoiding reads overtaking a pending save. Storage failures are surfaced; initial-loading/error states prevent editing over unread saved data.
- Same-account session/token refreshes do not reset private screens.
- Existing unowned records are preserved, never read as a fallback, and never copied into the next login. Secure recovery is a separate concern because the old records contain no reliable authenticated ownership.
- Native prayer reminders receive an account label and generic lock-screen content. Switching accounts cancels foreign scheduled/delivered reminders; late scheduling is cancelled. Legacy unowned prayer reminders are removed rather than reassigned.
- Cancelled journal reminders retain their configuration but appear disabled when their native notification IDs no longer exist; users can re-enable them after returning to their account. Browser/Expo Go cannot verify native scheduling.

## Checks

- Dedicated mobile TypeScript check: passed.
- Thirteen new regression cases for storage ownership, stale callbacks, read/write ordering, logout and reminder ownership/cancellation.
- Existing nineteen DOB, subscription and tour cases: all 32 cases passed together.
- Browser-only fixture journey: A → sign out → B → sign out → A passed at 402 × 874. Each account saw only its own journal; the legacy record remained unchanged and hidden. This is separate from real Supabase authentication and native-device verification.

No database migration, store-identity change, package upgrade, account creation or production deletion is part of this repair. The dated readiness audit remains the historical pre-repair assessment.
