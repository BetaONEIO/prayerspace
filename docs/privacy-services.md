# Privacy services

## Moderation access

Reports are saved by authenticated RPCs and can only target records the reporter
may access. The queue is under **Settings → Moderation (staff only)**.
Ordinary users cannot read the queue or assign themselves moderator access.

No real account has automatically been made a moderator. A project administrator
must explicitly authorize a staff account before adding its verified Auth user ID
in the Supabase SQL editor:

```sql
insert into public.moderators (user_id)
values ('AUTHORIZED_STAFF_AUTH_USER_UUID'::uuid)
on conflict do nothing;
```

Remove access with a targeted delete from this table. Never grant the role from
client profile metadata. Moderators can resolve/dismiss reports or explicitly
confirm removal of reported posts/messages. Removal is irreversible.

## Exports

**Settings → Data & Backup → Download My Data** prepares JSON containing the
caller's server records and verified account-scoped device records. Unassigned
legacy records and other accounts' private journals are excluded.
Owned uploaded files have signed download links valid for one hour; users must
save files before the links expire. Native export opens the OS share/save sheet;
its temporary export file is removed afterward. Web export creates a download.

## Deletion

Deletion needs a verified caller, a matching expected user ID, explicit `DELETE`
confirmation, and a sign-in within the preceding 15 minutes. It creates a
durable, idempotent self-deletion job. The API worker runs at startup, after an
accepted request and every minute while the API process is running. Failed jobs
become eligible for retry after their lease expires.

The worker disables further sign-in, removes owned uploaded files, cleans up
authored messages and deletes the Auth identity. Foreign-key cascades remove
account-owned rows. Shared communities remain without that owner's identity.
The confirmed client flow invalidates callbacks and clears only the requesting
account's scoped device records. Unassigned legacy data is not presumed owned.
Subscriptions and copies independently retained by other people are not removed.

Historical placeholder deletion flags are deliberately **not** imported into
executable jobs. A new explicit request is required. For a release, arrange
continuous or scheduled execution of the worker; an API process that is stopped
cannot complete retries.

## Journal backup

Backup starts off and requires consent. Automatic sync runs while the app is
open; **Restore / Sync now** also supports a download-only restore when automatic
backup is off. Private records are access-controlled, not end-to-end encrypted.
Limits are 5 MB and 5,000 cloud records, including deletion history.

Revision checks prevent stale overwrites. Conflicts retain device/cloud versions;
users can accept the cloud version or keep both. Conflicting deletions need a
separate destructive confirmation. Offline edits remain on the device.

## Verification

Mobile/API TypeScript checks and 50 automated tests passed. Database role and
ownership assertions passed against the app database with fixtures rolled back:
cross-account journal/export isolation, compare-and-swap conflicts, moderator
authorization, recent-authentication deletion and idempotent retries.
Unauthenticated export/deletion HTTP requests return 401.

The automated signed-in browser run failed with an internal testing-environment
error before completion; it is not evidence of a passing UI journey. Native OS
sharing, device-to-device journal restoration and an actual native self-deletion
journey still need verification before release. No existing account was deleted
and the app was not published.
