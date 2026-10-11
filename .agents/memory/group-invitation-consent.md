---
name: Group invitation consent
description: Authorization and compatibility decisions for private group chat invitations.
---
Use addressed invitations between accepted friends, not shared bearer codes. Require
recipient acceptance before granting access to the private chat history. Existing
memberships are preserved; legacy add operations must not grant new membership.

**Why:** The previous invitation UI immediately added friends and exposed chat history
without their acceptance. Compatibility with older clients is not permission to keep
that behavior.

**How to apply:** Treat invitation identifiers as references, not credentials. Recheck
friendship, blocks and inviter authority when accepting. A previously accepted
invitation must not restore membership after removal; require a new invitation.
Unavailable pending invitations must remain dismissible and must not prevent an
otherwise eligible admin from sending a replacement.

Invitation privacy supports Friends and No one, with Friends as the default.
Do not restore the misleading Everyone option or broaden private invitations to
strangers. Selecting No one cancels pending received invitations permanently;
switching back to Friends requires fresh invitations. Existing memberships stay
unchanged.

**Why:** The previous privacy options were local-only. Making them effective must
not silently weaken the accepted-friend policy or leave old pending invitations
able to bypass the recipient's new restriction.

**How to apply:** Enforce the recipient's saved preference in server eligibility,
including legacy send paths and acceptance. Serialize preference changes with
sends/responses; preserve conversation → recipient → invitation lock order, with
the preference setter taking no conversation locks.
