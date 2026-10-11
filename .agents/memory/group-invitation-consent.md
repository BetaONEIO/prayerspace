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

Reading or dismissing an invitation alert must not accept or decline the
invitation. Dismissal hides that alert across devices, while the invitation
remains actionable in the inbox. Alert receipts are recipient-private and must
not become read receipts visible to senders.

**Why:** Notification housekeeping is not consent to join or reject a private
chat. Adding metadata to sender-readable invitation rows would expose recipient
behavior without opting into shared read receipts.

**How to apply:** Keep alert actions separate from invitation responses. Only
eligible pending, unexpired, non-dismissed invitations produce in-app alerts;
receipt updates are monotonic and scoped to the authenticated recipient. Do not
add external messaging or push notifications as part of these in-app alerts.
