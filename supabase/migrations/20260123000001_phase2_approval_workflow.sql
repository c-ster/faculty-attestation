-- =============================================
-- Phase 2: Approval Workflow System
-- NPS Public-Release Self-Certification System
-- =============================================

-- =============================================
-- 1. New Enums for Workflow Management
-- =============================================

-- Workflow step enum (defines the approval chain)
CREATE TYPE public.workflow_step AS ENUM (
  'submitted',           -- Initial submission by faculty
  'chair_review',        -- Department chair review
  'vice_provost_review', -- Vice Provost final review
  'completed'            -- Workflow complete (released or not_released)
);

-- Review decision enum
CREATE TYPE public.review_decision AS ENUM (
  'pending',             -- Awaiting review
  'approved',            -- Approved to proceed
  'rejected',            -- Rejected/returned
  'returned_for_revision' -- Needs changes before proceeding
);

-- Notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'submission_received',      -- Confirm submission to faculty
  'review_assigned',          -- Notify reviewer of new assignment
  'review_completed',         -- Notify submitter of review outcome
  'revision_requested',       -- Notify submitter of required changes
  'final_decision',           -- Notify submitter of final release decision
  'reminder'                  -- Reminder for pending reviews
);

-- Notification status enum
CREATE TYPE public.notification_status AS ENUM (
  'pending',
  'sent',
  'failed'
);

-- =============================================
-- 2. Add Workflow Fields to Submissions Table
-- =============================================

-- Add current workflow step tracking
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS current_step public.workflow_step NOT NULL DEFAULT 'submitted';

-- Add assigned reviewer (for current step)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add workflow metadata
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS workflow_started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS workflow_completed_at TIMESTAMP WITH TIME ZONE;

-- Add priority flag for expedited review
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS is_expedited BOOLEAN NOT NULL DEFAULT false;

-- Add due date for review
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS review_due_date TIMESTAMP WITH TIME ZONE;

-- =============================================
-- 3. Reviews Table (tracks each review action)
-- =============================================

CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  workflow_step public.workflow_step NOT NULL,
  decision public.review_decision NOT NULL DEFAULT 'pending',

  -- Review details
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,

  -- For returned_for_revision decisions
  revision_instructions TEXT,

  -- Tracking
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Add index for faster lookups
CREATE INDEX idx_reviews_submission_id ON public.reviews(submission_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_pending ON public.reviews(reviewer_id, decision) WHERE decision = 'pending';

-- =============================================
-- 4. Review Comments Table
-- =============================================

CREATE TABLE public.review_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Comment content
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- Internal comments not visible to submitter

  -- Threading support
  parent_comment_id UUID REFERENCES public.review_comments(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX idx_review_comments_submission_id ON public.review_comments(submission_id);
CREATE INDEX idx_review_comments_review_id ON public.review_comments(review_id);

-- =============================================
-- 5. Notifications Table
-- =============================================

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,

  -- Notification details
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Status tracking
  status public.notification_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- For email notifications
  email_to TEXT,

  -- Read status (for in-app notifications)
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_pending ON public.notifications(status) WHERE status = 'pending';
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- =============================================
-- 6. Workflow Routing Rules Table
-- =============================================

CREATE TABLE public.routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Matching criteria (NULL means match any)
  department TEXT,
  school TEXT,
  has_risk_flags BOOLEAN,
  risk_flag_types TEXT[], -- Specific risk flags to match

  -- Routing action
  assign_to_role public.app_role NOT NULL,
  assign_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Rule metadata
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = checked first
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. RLS Policies for New Tables
-- =============================================

-- Reviews Policies
CREATE POLICY "Reviewers can view their assigned reviews"
  ON public.reviews FOR SELECT
  USING (reviewer_id = auth.uid());

CREATE POLICY "Submitters can view reviews on their submissions"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = reviews.submission_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Leadership can view reviews in their scope"
  ON public.reviews FOR SELECT
  USING (
    public.has_role(auth.uid(), 'vice_provost') OR
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE s.id = reviews.submission_id
      AND (public.has_role(auth.uid(), 'chair') OR public.has_role(auth.uid(), 'lab_director'))
      AND p.department = s.department
    )
  );

CREATE POLICY "Reviewers can update their own reviews"
  ON public.reviews FOR UPDATE
  USING (reviewer_id = auth.uid() AND decision = 'pending');

CREATE POLICY "System can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'vice_provost') OR
    public.has_role(auth.uid(), 'chair') OR
    public.has_role(auth.uid(), 'lab_director')
  );

-- Review Comments Policies
CREATE POLICY "Users can view non-internal comments on their submissions"
  ON public.review_comments FOR SELECT
  USING (
    (NOT is_internal AND EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = review_comments.submission_id
      AND s.user_id = auth.uid()
    ))
    OR user_id = auth.uid()
  );

CREATE POLICY "Leadership can view all comments in their scope"
  ON public.review_comments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'vice_provost') OR
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE s.id = review_comments.submission_id
      AND (public.has_role(auth.uid(), 'chair') OR public.has_role(auth.uid(), 'lab_director'))
      AND p.department = s.department
    )
  );

CREATE POLICY "Users can create comments"
  ON public.review_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Submitter can comment on own submission (non-internal only)
      (NOT is_internal AND EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.id = review_comments.submission_id
        AND s.user_id = auth.uid()
      ))
      OR
      -- Reviewers/leadership can comment
      public.has_role(auth.uid(), 'chair') OR
      public.has_role(auth.uid(), 'lab_director') OR
      public.has_role(auth.uid(), 'vice_provost') OR
      public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.review_comments FOR UPDATE
  USING (user_id = auth.uid());

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications (mark read)"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true); -- Controlled by application logic

-- Routing Rules Policies (admin only)
CREATE POLICY "Admins can manage routing rules"
  ON public.routing_rules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Leadership can view routing rules"
  ON public.routing_rules FOR SELECT
  USING (
    public.has_role(auth.uid(), 'chair') OR
    public.has_role(auth.uid(), 'lab_director') OR
    public.has_role(auth.uid(), 'vice_provost') OR
    public.has_role(auth.uid(), 'admin')
  );

-- =============================================
-- 8. Update Policies for Submissions (Reviewer Access)
-- =============================================

-- Reviewers can view submissions assigned to them
CREATE POLICY "Reviewers can view assigned submissions"
  ON public.submissions FOR SELECT
  USING (assigned_to = auth.uid());

-- Reviewers can update submissions they're reviewing
CREATE POLICY "Reviewers can update assigned submissions"
  ON public.submissions FOR UPDATE
  USING (
    assigned_to = auth.uid() AND
    (
      public.has_role(auth.uid(), 'chair') OR
      public.has_role(auth.uid(), 'lab_director') OR
      public.has_role(auth.uid(), 'vice_provost')
    )
  );

-- =============================================
-- 9. Helper Functions for Workflow
-- =============================================

-- Function to get next workflow step
CREATE OR REPLACE FUNCTION public.get_next_workflow_step(current public.workflow_step)
RETURNS public.workflow_step
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE current
    WHEN 'submitted' THEN 'chair_review'::public.workflow_step
    WHEN 'chair_review' THEN 'vice_provost_review'::public.workflow_step
    WHEN 'vice_provost_review' THEN 'completed'::public.workflow_step
    ELSE 'completed'::public.workflow_step
  END
$$;

-- Function to advance workflow (called after approval)
CREATE OR REPLACE FUNCTION public.advance_workflow(
  _submission_id UUID,
  _decision public.review_decision,
  _notes TEXT DEFAULT NULL
)
RETURNS public.submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _submission public.submissions;
  _next_step public.workflow_step;
  _new_status public.submission_status;
BEGIN
  -- Get current submission
  SELECT * INTO _submission FROM public.submissions WHERE id = _submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- Determine next step based on decision
  IF _decision = 'approved' THEN
    _next_step := public.get_next_workflow_step(_submission.current_step);

    -- If workflow is complete, set final status
    IF _next_step = 'completed' THEN
      _new_status := 'released';

      UPDATE public.submissions
      SET current_step = _next_step,
          status = _new_status,
          workflow_completed_at = now(),
          assigned_to = NULL
      WHERE id = _submission_id
      RETURNING * INTO _submission;
    ELSE
      -- Move to next step
      UPDATE public.submissions
      SET current_step = _next_step,
          status = 'under_review',
          assigned_to = NULL -- Will be assigned by routing
      WHERE id = _submission_id
      RETURNING * INTO _submission;
    END IF;

  ELSIF _decision = 'rejected' THEN
    UPDATE public.submissions
    SET status = 'not_released',
        current_step = 'completed',
        workflow_completed_at = now(),
        assigned_to = NULL
    WHERE id = _submission_id
    RETURNING * INTO _submission;

  ELSIF _decision = 'returned_for_revision' THEN
    -- Return to submitted state for revision
    UPDATE public.submissions
    SET current_step = 'submitted',
        status = 'submitted',
        assigned_to = NULL
    WHERE id = _submission_id
    RETURNING * INTO _submission;
  END IF;

  -- Log the workflow action
  INSERT INTO public.attestation_logs (submission_id, user_id, action, previous_value, new_value)
  VALUES (
    _submission_id,
    auth.uid(),
    'workflow_' || _decision::text,
    _submission.current_step::text,
    _next_step::text
  );

  RETURN _submission;
END;
$$;

-- Function to assign reviewer based on routing rules
CREATE OR REPLACE FUNCTION public.auto_assign_reviewer(_submission_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _submission public.submissions;
  _rule public.routing_rules;
  _reviewer_id UUID;
BEGIN
  -- Get submission details
  SELECT * INTO _submission FROM public.submissions WHERE id = _submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- Find matching routing rule
  SELECT * INTO _rule
  FROM public.routing_rules
  WHERE is_active = true
    AND (department IS NULL OR department = _submission.department)
    AND (school IS NULL OR school = _submission.school)
    AND (has_risk_flags IS NULL OR has_risk_flags = (array_length(_submission.risk_flags, 1) > 0))
  ORDER BY priority DESC
  LIMIT 1;

  -- If rule specifies a user, use that
  IF _rule.assign_to_user_id IS NOT NULL THEN
    _reviewer_id := _rule.assign_to_user_id;
  ELSE
    -- Find a user with the specified role in the same department
    SELECT ur.user_id INTO _reviewer_id
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = _rule.assign_to_role
      AND (p.department = _submission.department OR _rule.assign_to_role IN ('vice_provost', 'admin'))
    LIMIT 1;
  END IF;

  -- Update submission with assigned reviewer
  IF _reviewer_id IS NOT NULL THEN
    UPDATE public.submissions
    SET assigned_to = _reviewer_id,
        review_due_date = now() + interval '7 days'
    WHERE id = _submission_id;

    -- Create review record
    INSERT INTO public.reviews (submission_id, reviewer_id, workflow_step, due_date)
    VALUES (_submission_id, _reviewer_id, _submission.current_step, now() + interval '7 days');
  END IF;

  RETURN _reviewer_id;
END;
$$;

-- =============================================
-- 10. Triggers for Workflow Automation
-- =============================================

-- Trigger to start workflow when submission is created
CREATE OR REPLACE FUNCTION public.on_submission_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Set workflow started timestamp
  NEW.workflow_started_at := now();
  NEW.current_step := 'submitted';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER submission_workflow_init
  BEFORE INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.on_submission_created();

-- Trigger to update timestamps on reviews
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update timestamps on review_comments
CREATE TRIGGER update_review_comments_updated_at
  BEFORE UPDATE ON public.review_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update timestamps on routing_rules
CREATE TRIGGER update_routing_rules_updated_at
  BEFORE UPDATE ON public.routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 11. Default Routing Rules
-- =============================================

-- Default rule: Assign to department chair first
INSERT INTO public.routing_rules (department, assign_to_role, priority, description)
VALUES (NULL, 'chair', 10, 'Default: Route all submissions to department chair first');

-- High-risk submissions go directly to Vice Provost
INSERT INTO public.routing_rules (has_risk_flags, assign_to_role, priority, description)
VALUES (true, 'vice_provost', 20, 'High-risk submissions require Vice Provost review');
