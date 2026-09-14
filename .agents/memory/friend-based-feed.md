---
name: Friend-based feed & RLS
description: Release rules for relationship mutations, block precedence, and friend-only feed visibility.
---

Relationship mutations must use server-side RPCs. Friendship and prayer
visibility must be enforced by RLS, and a block in either direction overrides
requests, friendship, feed visibility, and relationship notifications. The
friends migration remains a release prerequisite until it is applied and
verified with real accounts.

**Why:** Client-side checks can race, and client-side hiding cannot prevent
direct API access by blocked or unauthorized users.

**How to apply:** Apply the migration in the Supabase SQL Editor, resolve any
duplicate-pair preflight failure deliberately, then run the three-account
request/accept/decline/cancel/unfriend/block/privacy flow before release.
Extend RPC/RLS rules before adding any new relationship mutation or
friend-only content surface; never add a direct-write client fallback.
