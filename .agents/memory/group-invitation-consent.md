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
