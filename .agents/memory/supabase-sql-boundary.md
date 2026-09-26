---
name: Supabase connection SQL boundary
description: Limits of the connected Supabase data proxy for database schema work
---

The connected Supabase integration exposes the project's REST/PostgREST data API, not arbitrary SQL execution. A service-role credential can bypass RLS for data operations but cannot create SQL functions through PostgREST.

**Why:** A partially deployed friendship schema allowed authenticated data tests while required RPCs remained absent. Mistaking the connected data proxy for SQL administration would leave the app broken or tempt an insecure direct-table-write workaround.

**How to apply:** For future database migrations, confirm a separately authorized SQL execution path that targets the same intended project. Without one, prepare a narrowly scoped SQL Editor patch and report the deployment as blocked; do not silently replace security-definer RPCs with direct client writes.