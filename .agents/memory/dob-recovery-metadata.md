---
name: DOB recovery metadata freshness
description: Why missing DOB recovery needs current server metadata rather than a persisted session snapshot
---

A saved profile DOB is authoritative. When it is missing, recover only from current authenticated server metadata, not the user metadata cached in a persisted Supabase session.

**Why:** Metadata edits on another client do not immediately refresh a persisted session snapshot. Reconstructing missing data from that cache can restore a removed DOB instead of requiring completion. A signed-in session proves identity, not metadata freshness.

**How to apply:** Before reconstructing missing profile age data, fetch the current authenticated user, require the same identity, validate its DOB, and propagate fetch errors instead of falling back to the cache. No source means required completion; an editable age-verified flag is not a substitute. Do not overwrite an existing saved profile DOB from metadata.

OAuth identity creation may precede DOB completion. Keep completion mandatory
for every provider, even when the profile row is absent; do not require a DOB
in the OAuth auth-user creation trigger.

**Why:** Google and Apple authentication do not supply the required DOB. A
trigger rejecting those initial identity records would prevent the user from
authenticating far enough to complete the form. A missing profile is not proof
of age.

**How to apply:** Keep identity establishment separate from permission to use
the app. Block private-screen interaction until the saved DOB is loaded and
validated, then allow the completion form or the verified app routes as
appropriate. Shared profile loading must validate existing DOBs for OAuth and
restored sessions as well as email sessions.
