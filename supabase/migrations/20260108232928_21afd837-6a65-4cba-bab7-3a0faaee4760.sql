-- Make submission_id have a default temporary value that will be replaced by the trigger
-- This allows inserts without specifying submission_id
ALTER TABLE public.submissions ALTER COLUMN submission_id SET DEFAULT '';