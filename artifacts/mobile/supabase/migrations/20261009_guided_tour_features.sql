BEGIN;
-- Keep original checkpoint positions; append the broader app feature tour.
-- Existing completed/skipped accounts retain their status and do not restart.
ALTER TABLE public.user_tour_progress
  DROP CONSTRAINT IF EXISTS user_tour_progress_step_check;
ALTER TABLE public.user_tour_progress
  ADD CONSTRAINT user_tour_progress_step_check CHECK (step BETWEEN 0 AND 12);
COMMIT;
