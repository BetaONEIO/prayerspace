---
name: Community catalogue authority
description: Keep discovery catalogue repairs separate from unverified local ownership and paid-access claims
---

Do not publish local community ownership or onboarding state as trusted catalogue records, memberships or paid access.

**Why:** The billing audit found that local ownership could be granted without a verified subscription. Automatically syncing those claims during discovery repair would make invalid ownership durable and publicly visible.

**How to apply:** When implementing persisted community creation/joining, validate ownership and relevant entitlements on the trusted backend first. A working discovery catalogue is not evidence that creation, membership or paid authorization is implemented.

Conversation membership and paid-community ownership are separate authorizations. A local group ID or cached admin label is not proof of either.

**Why:** Older prayer-group creation existed only on the device, without a trusted link to a paid community. Importing those role labels or matching groups to communities by name could make unverified permissions permanent.

**How to apply:** Establish new standalone prayer-chat membership through authenticated server operations. Preserve legacy local groups without automatically importing or promoting them. Do not use an account's general church entitlement as proof of access to a particular chat.
