-- Add has_coauthor_concurrence field to self_certifications table
-- This tracks whether the submitter has received concurrence from all co-authors

ALTER TABLE public.self_certifications
ADD COLUMN IF NOT EXISTS has_coauthor_concurrence boolean DEFAULT false;

-- Add a comment explaining the field
COMMENT ON COLUMN public.self_certifications.has_coauthor_concurrence IS 'Indicates whether concurrence for release has been received from all co-authors, including CRADA partners, MOA/MOU collaborators, and other academic collaborators';
