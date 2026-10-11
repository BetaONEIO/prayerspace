---
name: Authenticated SQL fixtures
description: Supabase JWT role claims must be present when testing authenticated triggers and routines.
---
SQL security fixtures must set an authenticated JWT role claim in addition to the user's JWT identity and the authenticated PostgreSQL role.

**Why:** A group-message deletion test passed with only a user identity and SQL role, but real authenticated HTTP deletion failed because an auth.role()-conditional trigger was not exercised by that fixture.

**How to apply:** Set the JWT role to authenticated inside the rollback-only transaction. Include actual caller-JWT HTTP requests when verifying storage ownership, policies, and mutation triggers; a security-definer SQL test alone does not reproduce the full client path.
