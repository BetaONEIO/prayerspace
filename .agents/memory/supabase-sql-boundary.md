---
name: Supabase connection SQL boundary
description: Limits of the connected Supabase data proxy for database schema work
---

The connected Supabase integration exposes the project's REST/PostgREST data API, not arbitrary SQL execution. A service-role credential can bypass RLS for data operations but cannot create SQL functions through PostgREST.

**Why:** REST data access and SQL administration are separate capabilities. Assuming schema authority from a data connector can leave required routines unapplied or encourage unsafe security bypasses.

**How to apply:** For future database migrations, confirm a separately authorized SQL execution path that targets the same intended project. Without one, prepare a narrowly scoped SQL Editor patch and report the deployment as blocked; do not silently replace security-definer RPCs with direct client writes.

Do not assume the bound Supabase connector targets the same project as the mobile app configuration.

**Why:** Bound integrations and runtime app configuration can refer to different databases. Similar table or query errors do not prove they share a target.

**How to apply:** Confirm the target before schema work. Use the app's configured client for app-specific read-only checks; never apply an app migration through a different connector or the workspace's separate database.

Empty grant metadata from a restricted SQL reader does not prove that client roles lack access.

**Why:** Catalog visibility depends on the querying role. Its limited view is not a privacy guarantee for other roles.

**How to apply:** Check effective access for the actual anonymous and authenticated client roles, including both field permissions and row policies. Confirm with normal client requests; row-level read-all policies do not provide field privacy.

The separately authorized Supabase Management API now provides SQL administration for the app-configured project. Its `read_only: true` query mode uses a restricted database role; that role's lack of CREATE privilege does not mean the management credential lacks migration access.

**Why:** A read-only permission probe returned a restricted role with CREATE denied, while the same SELECT-only probe in normal query mode returned an administrative role with CREATE allowed.

**How to apply:** Keep diagnostics read-only by default. When checking administrative capability, a SELECT-only permission query in normal mode can distinguish the restricted execution role from the credential's actual authority without changing data. Reconfirm project identity and access before migrations; the separate REST connector remains a different target.