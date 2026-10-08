---
name: Community catalogue authority
description: Keep discovery catalogue repairs separate from unverified local ownership and paid-access claims
---

Do not publish local community ownership or onboarding state as trusted catalogue records, memberships or paid access.

**Why:** The billing audit found that local ownership could be granted without a verified subscription. Automatically syncing those claims during discovery repair would make invalid ownership durable and publicly visible.

**How to apply:** When implementing persisted community creation/joining, validate ownership and relevant entitlements on the trusted backend first. A working discovery catalogue is not evidence that creation, membership or paid authorization is implemented.
