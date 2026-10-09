# Prayer Space guided tour

## Scope

The welcome uses the requested copy and existing theme/icon library. The thirteen checkpoints use the actual Feed, safe prayer form, prayer interaction controls, Find Friends, Groups, Community, Mine/answered controls, Prayer Journal, My Requests, solo prayer, Text/Voice composition, recipient selection and Home screens.

Empty screens stay empty. The tour does not create demo users, prayers, groups, communities, messages or activity. Searching is optional; no friend request is sent automatically. Communities are not created or joined automatically. Prayer practice never publishes or loads/overwrites a saved draft.

Settings → **Take a Tour of Prayer Space** starts a fresh replay. **Pause Tour** keeps the checkpoint; **Skip Tutorial** and **Explore Prayer Space** stop automatic presentation on later launches. Back from the prayer form returns to the composer checkpoint.

## Storage

The additive `20261009_guided_tour.sql` and `20261009_guided_tour_features.sql` migrations have been applied to the verified app-configured development Supabase project. Authenticated users can read, insert and update only their own progress. Anonymous access is not granted. The table stores status, step and timestamp, not practice content.

Progress is also saved with an account-specific local key. Local writes do not wait for network writes. Remote writes are coalesced and timeout after five seconds. Restore uses the newer valid local/account checkpoint; foreground reconciliation reads the remote checkpoint before retrying so another device's newer completion is not blindly overwritten.

Apply both additive migrations to the intended production database before releasing the update there. The app does not depend on a SQL-capable connected-data proxy.

## Checks completed

- Mobile TypeScript compilation.
- Three pure expanded-tour-definition/progress-validation/merge tests.
- Authenticated database checks of welcome/progress/skip/completion writes and reloads.
- Cross-account reads return no rows; cross-account writes are forbidden.
- Invalid step values and anonymous reads are rejected.

Commands:

```sh
pnpm --filter @workspace/mobile run typecheck
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/mobile/lib/tourSteps.test.ts
# Requires isolated development fixtures; never use real users:
TOUR_TEST_DEV_PROJECT_CONFIRMED=yes node artifacts/mobile/scripts/verify-tour-progress.cjs
```

## Browser and device verification

The initial signed-in browser pass confirmed welcome, the Feed and safe prayer form. Its empty-account assertion failed because the repair harness had created a public anonymous test prayer visible to all accounts—not because the tour inserted data. That scratch-owned row was restricted to friends; a real authenticated query then confirmed account C's authorized feed is empty. Remaining expanded-tour observations are recorded below after continuation.

Recipient selection during the guided preview does not request Contacts permission or replace the user's existing recipient state. Solo prayer does not start automatically; if the user deliberately begins a real session, the tour pauses and lets that session continue normally.

The signed-in continuation passed the remaining thirteen-step journey: empty-feed fallback, optional real friend-search/+person spotlight, pause/reload/resume at the saved checkpoint, all additional feature routes, Back from completion, finish/reload without an automatic tour, Settings replay, and skip/reload for two isolated accounts. A third account verified real other-author support controls, owner-only update/answered controls and the existing modal's tour footer without submitting anything. The added feature cards and finish controls fitted 320×568; community navigation remained visible at 390×844.

No recording, solo session, recipient selection/send or new prayer/update/comment/request/group/community was submitted by the browser verification. Temporary development records and accounts were removed afterward.

Observation limits: one My Requests screenshot captured an empty state while the accessibility snapshot reported two requests, consistent with the loading-timing differences observed during reloads; this was not independently established as a persistent defect. Browser logs contained HTTP 406 resource failures, CSP inline-style refusals and non-blocking platform warnings. These checks do not certify native hardware or keyboard behavior.

Browser viewport emulation is not proof of native iOS/Android keyboard behavior. Before a native release, check on both platforms:

1. Start after registration/profile verification; verify exact welcome copy and both actions.
2. Open the real practice form, type in the native editor, use Done/Back/Next/Skip/Pause, and confirm no prayer is published and an existing real draft is unchanged.
3. Search for friends with the keyboard open; verify the target stays visible and the card or Hide keyboard action remains reachable.
4. Advance/back between checkpoints; the keyboard must close and spotlight coordinates must follow the actual safe area, scroll viewport and rotation.
5. Open prayer comments, praying-user and update modals during the tour; tour controls and close actions must remain reachable above the keyboard and home indicator.
6. Verify narrow phones, large system text, VoiceOver/TalkBack, Android hardware Back and system reduced motion.
7. Pause, terminate/restart, resume, finish and restart; completion/skip must not repeat. Replay from Settings must remain available.

Existing Expo package-compatibility warnings predate the tour and were not changed as part of this feature.
