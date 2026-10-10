---
name: Account ownership of local records
description: Privacy constraints for legacy unassigned records and account transitions.
---

Do not automatically import older device-wide journals, favourites, people, reminders or prayer records into the next account that signs in. Preserve those unassigned records without exposing or overwriting them.

**Why:** Earlier releases did not store authenticated ownership for these records. Signing in on the same installation does not establish that the records belong to that account. Automatic migration could turn the cross-account privacy defect into permanent misassignment.

**How to apply:** Recovery needs independently verified ownership or an explicitly authorized recovery process; absence of scoped records is not permission to use the legacy keys as a fallback. Keep this limitation clear when discussing recovery or adding backups.

Account transitions must invalidate old asynchronous callbacks, including when the same account returns after another session. Same-account token refreshes should not reset private screens or invalidate current edits.

**Why:** A user-ID-only check cannot distinguish an obsolete callback from a prior session after an A → B → A switch. Resetting only in an effect can also leave private data visible before that effect runs.

**How to apply:** Preserve the session-generation boundary and account-specific storage/cache identity when extending local state. Native reminder ownership and delayed scheduling require the same boundary; do not resume unassigned reminders or expose prayer text on shared lock screens.
