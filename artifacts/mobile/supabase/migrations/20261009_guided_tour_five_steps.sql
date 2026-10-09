BEGIN;
-- Older clients/checkpoints remain valid; version 2 uses five feature chapters.
ALTER TABLE public.user_tour_progress
  ADD COLUMN IF NOT EXISTS tour_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.user_tour_progress
  DROP CONSTRAINT IF EXISTS user_tour_progress_version_steps_check;
ALTER TABLE public.user_tour_progress
  ADD CONSTRAINT user_tour_progress_version_steps_check
  CHECK (tour_version = 1 OR (tour_version = 2 AND step BETWEEN 0 AND 4));
COMMIT;
