BEGIN;
CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  step integer NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 7),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_tour_progress FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.user_tour_progress TO authenticated;
DROP POLICY IF EXISTS tour_select_self ON public.user_tour_progress;
CREATE POLICY tour_select_self ON public.user_tour_progress FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS tour_insert_self ON public.user_tour_progress;
CREATE POLICY tour_insert_self ON public.user_tour_progress FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
DROP POLICY IF EXISTS tour_update_self ON public.user_tour_progress;
CREATE POLICY tour_update_self ON public.user_tour_progress FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
COMMIT;
