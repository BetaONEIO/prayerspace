---
name: Privacy consent boundaries
description: Why historical deletion flags are not executable consent and journal upload must remain opt-in.
---

Do not backfill executable account-deletion jobs from historical profile deletion
flags. Require a new, recently authenticated, explicitly confirmed self-deletion.

**Why:** The earlier UI only set a flag and promised later processing; it did not
execute deletion. Automatically converting old flags into live jobs would trigger
destructive actions without renewed confirmation.

**How to apply:** Migration, maintenance and worker changes must preserve this
boundary. Staff access also needs explicit authorization; do not automatically
promote the first signed-in user or infer a moderator from profile metadata.

Journal cloud uploads must remain opt-in. Do not label access-controlled storage
as end-to-end encrypted.

**Why:** Private journal contents are sensitive; fixing the old placeholder backup
status is not permission to upload every existing device record automatically.

**How to apply:** Keep recovery ownership rules intact, require consent before
uploads, and expose errors/conflicts instead of silently replacing offline edits.
