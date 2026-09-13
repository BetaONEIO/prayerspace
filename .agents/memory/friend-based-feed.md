---
name: Friend-based feed & RLS
description: How the community Feed tab fetches real posts from Supabase with friend-based visibility; SQL that must be manually applied in Supabase.
---

## Implementation

- `community.tsx` uses `useQuery(["feed-posts", userId])` to fetch from `prayer_requests` filtered by `audience IN ('everyone','friends')` and `status != 'archived'`, ordered by `created_at DESC`.
- RLS (enforced server-side) restricts which rows each user sees — no client-side friend filtering needed.
- A realtime subscription on `prayer_requests INSERT` calls `refetchFeed()` so new posts appear immediately.
- `handleStatusSubmit` inserts to Supabase first, gets a real UUID back, then adds the optimistic local post with that UUID so the DB sync `useEffect` deduplicates correctly.
- `message-preview-final.tsx` uses `audience: "friends"` (not `"everyone"`) for Feed posts.

## SQL migration (NOT yet applied — must be run manually in Supabase SQL Editor)

Relationship mutations and friend-only visibility now depend on the companion
friends/connections migration. Treat the migration as a release prerequisite:
it intentionally stops on duplicate active pairs instead of deleting them, and
the Friends audit cannot be called complete until it is applied and verified
with real accounts.

**Why:** Client-side relationship checks can race and the previous RLS recipe
was documentation rather than proof that the live database enforced privacy.

**How to apply:** Apply the migration in the Supabase SQL Editor, resolve any
duplicate-pair preflight failure deliberately, then run the three-account
request/accept/decline/unfriend/block/privacy flow before release.

```sql
DROP POLICY IF EXISTS "Anyone can view public prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Public posts visible to all" ON public.prayer_requests;
DROP POLICY IF EXISTS "Friends can read friends posts" ON public.prayer_requests;

CREATE POLICY "Public posts visible to all" ON public.prayer_requests
  FOR SELECT USING (audience = 'everyone' AND status != 'archived');

CREATE POLICY "Friends can read friends posts" ON public.prayer_requests
  FOR SELECT USING (
    audience = 'friends' AND status != 'archived'
    AND EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'accepted'
      AND (
        (fr.sender_id = auth.uid() AND fr.receiver_id = prayer_requests.author_id)
        OR
        (fr.receiver_id = auth.uid() AND fr.sender_id = prayer_requests.author_id)
      )
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_requests;
```

**Why:** The old single "public" policy only matched `audience = 'everyone'`; it had no concept of friend-based visibility. The new pair of policies handle both cases at the DB level so RLS does the access control, not client-side JS.

**How to apply:** Supabase SQL Editor → New Query → paste → Run. The management API does not accept the service role JWT (requires a personal access token).
