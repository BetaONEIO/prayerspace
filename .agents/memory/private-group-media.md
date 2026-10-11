---
name: Private group media
description: Authorization and revocation decisions for group photos, voice notes, and account exports.
---
Ordinary group-media viewing should not mint long-lived storage capabilities. Authorize new downloads against current membership, message visibility, deletion, and blocking, including a recheck after fetching bytes.

**Why:** Signed URLs outlive group membership, so a removed member could continue downloading if ordinary chat viewing used them. Already downloaded copies cannot be revoked.

**How to apply:** Keep group viewing separate from account exports. A user's explicit own-account export may include their own uploads, but any privileged signing must use an authenticated server-produced ownership manifest, never client-supplied paths. Preserve uploader ownership for account deletion.

Keep existing chat visibility filtering authoritative when adding media metadata.

**Why:** Prayer audience and blocked-sender rules must not be bypassed or maintained in two divergent history implementations.

**How to apply:** Update the history implementation actually used by the enriched snapshot; do not replace the current snapshot with an older migration definition.
