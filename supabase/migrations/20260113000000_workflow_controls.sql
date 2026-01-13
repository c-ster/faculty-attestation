-- ============================================================================
-- PHASE 2: WORKFLOW CONTROLS
-- Automated routing, approval workflows, and AI-assisted triage
-- ============================================================================

-- Create workflow status enum
CREATE TYPE workflow_status AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'revision_requested');

-- Create review decision enum
CREATE TYPE review_decision AS ENUM ('pending', 'approved', 'rejected', 'needs_revision', 'abstain');

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'submission_created',
  'status_changed',
  'review_requested',
  'review_completed',
  'workflow_approved',
  'workflow_rejected',
  'reminder'
);

-- ============================================================================
-- 1. ROUTING RULES - Automated routing configuration
-- ============================================================================
CREATE TABLE routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  -- Rule matching conditions (JSON for flexibility)
  conditions JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- {"risk_flags": {"contains": ["classified"]}}
  -- {"department": {"equals": "Computer Science"}}
  -- {"sponsor": {"contains": "DOD"}}
  -- {"risk_count": {"gte": 2}}

  -- Where to route matching submissions
  route_to_role app_role NOT NULL,

  -- Priority for rule ordering (lower = higher priority)
  priority INTEGER NOT NULL DEFAULT 100,

  -- Auto-assign specific user (optional, in addition to role)
  auto_assign_user_id UUID REFERENCES auth.users(id),

  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. SUBMISSION ROUTING HISTORY
-- ============================================================================
CREATE TABLE submission_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES routing_rules(id),
  routed_to_role app_role NOT NULL,
  routed_to_user_id UUID REFERENCES auth.users(id),
  reason TEXT, -- "Matched rule: High Risk Submissions" or "Manual assignment"
  routed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  routed_by UUID REFERENCES auth.users(id) -- null for auto-routing
);

-- ============================================================================
-- 3. APPROVAL WORKFLOWS - Workflow templates
-- ============================================================================
CREATE TABLE approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger conditions (when to use this workflow)
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  -- Example: {"risk_count": {"gte": 1}} triggers for any submission with risk flags

  -- Whether this is the default workflow
  is_default BOOLEAN NOT NULL DEFAULT false,

  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. WORKFLOW STEPS - Steps within a workflow
-- ============================================================================
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,

  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Who can approve this step
  reviewer_role app_role NOT NULL,

  -- How many approvals needed (for multi-reviewer scenarios)
  required_approvals INTEGER NOT NULL DEFAULT 1,

  -- Allow this step to be skipped under certain conditions
  can_skip BOOLEAN NOT NULL DEFAULT false,
  skip_conditions JSONB DEFAULT '{}',

  -- Timeout in days (null = no timeout)
  timeout_days INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. SUBMISSION WORKFLOW INSTANCES - Track which workflow a submission uses
-- ============================================================================
CREATE TABLE submission_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id),

  current_step INTEGER NOT NULL DEFAULT 1,
  status workflow_status NOT NULL DEFAULT 'pending',

  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Final decision
  final_decision review_decision,
  decision_notes TEXT
);

-- ============================================================================
-- 6. SUBMISSION REVIEWS - Individual reviewer assignments and decisions
-- ============================================================================
CREATE TABLE submission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  workflow_instance_id UUID REFERENCES submission_workflows(id) ON DELETE CASCADE,

  -- Which step this review is for
  step_id UUID REFERENCES workflow_steps(id),
  step_order INTEGER NOT NULL DEFAULT 1,

  -- Reviewer assignment
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),

  -- Review decision
  decision review_decision NOT NULL DEFAULT 'pending',
  recommendation TEXT,
  comments TEXT,

  -- Timestamps
  reviewed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,

  UNIQUE(submission_id, reviewer_id, step_order)
);

-- ============================================================================
-- 7. AI TRIAGE ASSESSMENTS
-- ============================================================================
CREATE TABLE ai_triage_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,

  -- Model info
  model_version TEXT NOT NULL DEFAULT 'rule-based-v1',

  -- Risk assessment
  risk_score DECIMAL(3,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Analysis results
  detected_concerns TEXT[] DEFAULT '{}',
  recommended_flags TEXT[] DEFAULT '{}',
  suggested_reviewer_role app_role,

  -- Full assessment data (JSON for flexibility)
  assessment_data JSONB DEFAULT '{}',

  -- Processing metadata
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 8. NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,

  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Link to relevant page
  action_url TEXT,

  -- Read status
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Email tracking
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 9. NOTIFICATION PREFERENCES
-- ============================================================================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  email_on_submission BOOLEAN NOT NULL DEFAULT true,
  email_on_status_change BOOLEAN NOT NULL DEFAULT true,
  email_on_review_request BOOLEAN NOT NULL DEFAULT true,
  email_on_decision BOOLEAN NOT NULL DEFAULT true,
  email_on_reminder BOOLEAN NOT NULL DEFAULT true,

  -- In-app notification preferences
  show_in_app_notifications BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_routing_rules_active ON routing_rules(active, priority);
CREATE INDEX idx_submission_routing_submission ON submission_routing(submission_id);
CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id, step_order);
CREATE INDEX idx_submission_workflows_submission ON submission_workflows(submission_id);
CREATE INDEX idx_submission_workflows_status ON submission_workflows(status);
CREATE INDEX idx_submission_reviews_reviewer ON submission_reviews(reviewer_id, decision);
CREATE INDEX idx_submission_reviews_submission ON submission_reviews(submission_id);
CREATE INDEX idx_ai_triage_submission ON ai_triage_assessments(submission_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_submission ON notifications(submission_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Routing Rules: Only admins can manage
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage routing rules"
  ON routing_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Leadership can view routing rules"
  ON routing_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'vice_provost', 'lab_director', 'chair')
    )
  );

-- Submission Routing: Viewable by submission owner and leadership
ALTER TABLE submission_routing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view routing for their submissions"
  ON submission_routing
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = submission_routing.submission_id
      AND submissions.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'vice_provost', 'lab_director', 'chair')
    )
  );

-- Approval Workflows: Admins manage, leadership views
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workflows"
  ON approval_workflows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view workflows"
  ON approval_workflows
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Workflow Steps: Same as workflows
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workflow steps"
  ON workflow_steps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view workflow steps"
  ON workflow_steps
  FOR SELECT
  TO authenticated
  USING (true);

-- Submission Workflows: Owner and leadership can view
ALTER TABLE submission_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow for their submissions"
  ON submission_workflows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = submission_workflows.submission_id
      AND submissions.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'vice_provost', 'lab_director', 'chair')
    )
  );

CREATE POLICY "Leadership can update submission workflows"
  ON submission_workflows
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'vice_provost')
    )
  );

-- Submission Reviews: Reviewers can see their reviews, leadership sees all
ALTER TABLE submission_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers can view and update their reviews"
  ON submission_reviews
  FOR ALL
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'vice_provost')
    )
  );

CREATE POLICY "Submission owners can view reviews"
  ON submission_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = submission_reviews.submission_id
      AND submissions.user_id = auth.uid()
    )
  );

-- AI Triage: Same access as submission
ALTER TABLE ai_triage_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view triage for their submissions"
  ON ai_triage_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = ai_triage_assessments.submission_id
      AND submissions.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'vice_provost', 'lab_director', 'chair')
    )
  );

-- Notifications: Users can only see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Notification Preferences: Users manage their own
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- INSERT DEFAULT WORKFLOW
-- ============================================================================
INSERT INTO approval_workflows (name, description, trigger_conditions, is_default, active)
VALUES (
  'Standard Review',
  'Default review workflow for all submissions',
  '{}',
  true,
  true
);

-- Get the workflow ID and insert default steps
DO $$
DECLARE
  default_workflow_id UUID;
BEGIN
  SELECT id INTO default_workflow_id FROM approval_workflows WHERE is_default = true LIMIT 1;

  INSERT INTO workflow_steps (workflow_id, step_order, name, description, reviewer_role, required_approvals, timeout_days)
  VALUES
    (default_workflow_id, 1, 'Department Chair Review', 'Initial review by department leadership', 'chair', 1, 7),
    (default_workflow_id, 2, 'Vice Provost Approval', 'Final approval for public release', 'vice_provost', 1, 14);
END $$;

-- Insert High Risk workflow
INSERT INTO approval_workflows (name, description, trigger_conditions, is_default, active)
VALUES (
  'High Risk Review',
  'Enhanced review workflow for submissions with multiple risk flags',
  '{"risk_count": {"gte": 2}}',
  false,
  true
);

DO $$
DECLARE
  high_risk_workflow_id UUID;
BEGIN
  SELECT id INTO high_risk_workflow_id FROM approval_workflows WHERE name = 'High Risk Review' LIMIT 1;

  INSERT INTO workflow_steps (workflow_id, step_order, name, description, reviewer_role, required_approvals, timeout_days)
  VALUES
    (high_risk_workflow_id, 1, 'Lab Director Review', 'Initial security review', 'lab_director', 1, 5),
    (high_risk_workflow_id, 2, 'Department Chair Review', 'Department approval', 'chair', 1, 7),
    (high_risk_workflow_id, 3, 'Vice Provost Approval', 'Final approval with security considerations', 'vice_provost', 1, 14);
END $$;

-- ============================================================================
-- INSERT DEFAULT ROUTING RULES
-- ============================================================================
INSERT INTO routing_rules (name, description, conditions, route_to_role, priority, active)
VALUES
  (
    'Classified Content',
    'Route submissions with classified content to Vice Provost immediately',
    '{"risk_flags": {"contains": ["contains_classified"]}}',
    'vice_provost',
    10,
    true
  ),
  (
    'Export Controlled',
    'Route export controlled submissions to Lab Director',
    '{"risk_flags": {"contains": ["contains_export_controlled"]}}',
    'lab_director',
    20,
    true
  ),
  (
    'Foreign Involvement',
    'Route submissions with foreign involvement to Department Chair',
    '{"risk_flags": {"contains": ["has_foreign_involvement"]}}',
    'chair',
    30,
    true
  ),
  (
    'High Risk Count',
    'Route submissions with 2+ risk flags to Vice Provost',
    '{"risk_count": {"gte": 2}}',
    'vice_provost',
    50,
    true
  ),
  (
    'Standard Submission',
    'Default routing for standard submissions',
    '{}',
    'chair',
    100,
    true
  );

-- ============================================================================
-- FUNCTIONS FOR WORKFLOW MANAGEMENT
-- ============================================================================

-- Function to get the appropriate workflow for a submission
CREATE OR REPLACE FUNCTION get_workflow_for_submission(p_submission_id UUID)
RETURNS UUID AS $$
DECLARE
  v_risk_count INTEGER;
  v_workflow_id UUID;
  v_conditions JSONB;
BEGIN
  -- Get risk flag count for the submission
  SELECT COALESCE(array_length(risk_flags, 1), 0) INTO v_risk_count
  FROM submissions WHERE id = p_submission_id;

  -- Find matching workflow based on trigger conditions
  -- Check high risk first (more specific)
  FOR v_workflow_id, v_conditions IN
    SELECT id, trigger_conditions FROM approval_workflows
    WHERE active = true AND is_default = false
    ORDER BY created_at
  LOOP
    -- Check if risk_count condition matches
    IF v_conditions ? 'risk_count' THEN
      IF (v_conditions->'risk_count'->>'gte')::INTEGER <= v_risk_count THEN
        RETURN v_workflow_id;
      END IF;
    END IF;
  END LOOP;

  -- Return default workflow
  SELECT id INTO v_workflow_id FROM approval_workflows WHERE is_default = true AND active = true LIMIT 1;
  RETURN v_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize workflow for a submission
CREATE OR REPLACE FUNCTION initialize_submission_workflow(p_submission_id UUID)
RETURNS UUID AS $$
DECLARE
  v_workflow_id UUID;
  v_instance_id UUID;
BEGIN
  -- Get appropriate workflow
  v_workflow_id := get_workflow_for_submission(p_submission_id);

  -- Create workflow instance
  INSERT INTO submission_workflows (submission_id, workflow_id, current_step, status)
  VALUES (p_submission_id, v_workflow_id, 1, 'pending')
  ON CONFLICT (submission_id) DO UPDATE SET
    workflow_id = v_workflow_id,
    current_step = 1,
    status = 'pending',
    started_at = NOW()
  RETURNING id INTO v_instance_id;

  RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to perform AI triage (rule-based for now)
CREATE OR REPLACE FUNCTION perform_ai_triage(p_submission_id UUID)
RETURNS UUID AS $$
DECLARE
  v_assessment_id UUID;
  v_risk_flags TEXT[];
  v_risk_count INTEGER;
  v_risk_score DECIMAL(3,2);
  v_risk_level TEXT;
  v_concerns TEXT[] := '{}';
  v_recommended_flags TEXT[] := '{}';
  v_suggested_role app_role;
  v_cert RECORD;
BEGIN
  -- Get submission risk flags
  SELECT risk_flags INTO v_risk_flags FROM submissions WHERE id = p_submission_id;
  v_risk_count := COALESCE(array_length(v_risk_flags, 1), 0);

  -- Get certification details
  SELECT * INTO v_cert FROM self_certifications WHERE submission_id = p_submission_id;

  -- Calculate risk score based on flags and certification
  v_risk_score := LEAST(1.0, v_risk_count * 0.2);

  -- Add specific concerns based on flags
  IF 'contains_classified' = ANY(v_risk_flags) THEN
    v_concerns := array_append(v_concerns, 'Contains potentially classified information');
    v_risk_score := LEAST(1.0, v_risk_score + 0.3);
  END IF;

  IF 'contains_export_controlled' = ANY(v_risk_flags) THEN
    v_concerns := array_append(v_concerns, 'Contains export-controlled data');
    v_risk_score := LEAST(1.0, v_risk_score + 0.2);
  END IF;

  IF 'contains_operational_info' = ANY(v_risk_flags) THEN
    v_concerns := array_append(v_concerns, 'Contains operationally sensitive information');
    v_risk_score := LEAST(1.0, v_risk_score + 0.2);
  END IF;

  IF 'has_foreign_involvement' = ANY(v_risk_flags) THEN
    v_concerns := array_append(v_concerns, 'Involves foreign nationals or entities');
    v_risk_score := LEAST(1.0, v_risk_score + 0.1);
  END IF;

  -- Determine risk level
  v_risk_level := CASE
    WHEN v_risk_score >= 0.7 THEN 'critical'
    WHEN v_risk_score >= 0.5 THEN 'high'
    WHEN v_risk_score >= 0.2 THEN 'medium'
    ELSE 'low'
  END;

  -- Suggest reviewer role based on risk
  v_suggested_role := CASE
    WHEN v_risk_level = 'critical' THEN 'vice_provost'
    WHEN v_risk_level = 'high' THEN 'lab_director'
    ELSE 'chair'
  END;

  -- Insert or update assessment
  INSERT INTO ai_triage_assessments (
    submission_id, model_version, risk_score, confidence_score, risk_level,
    detected_concerns, recommended_flags, suggested_reviewer_role, assessment_data
  )
  VALUES (
    p_submission_id, 'rule-based-v1', v_risk_score, 0.85, v_risk_level,
    v_concerns, v_recommended_flags, v_suggested_role,
    jsonb_build_object(
      'risk_flag_count', v_risk_count,
      'risk_flags', v_risk_flags,
      'has_certification', v_cert IS NOT NULL
    )
  )
  ON CONFLICT (submission_id) DO UPDATE SET
    risk_score = EXCLUDED.risk_score,
    risk_level = EXCLUDED.risk_level,
    detected_concerns = EXCLUDED.detected_concerns,
    suggested_reviewer_role = EXCLUDED.suggested_reviewer_role,
    assessment_data = EXCLUDED.assessment_data,
    created_at = NOW()
  RETURNING id INTO v_assessment_id;

  RETURN v_assessment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply routing rules to a submission
CREATE OR REPLACE FUNCTION apply_routing_rules(p_submission_id UUID)
RETURNS TABLE(rule_id UUID, rule_name TEXT, routed_to app_role) AS $$
DECLARE
  v_rule RECORD;
  v_submission RECORD;
  v_matches BOOLEAN;
  v_risk_count INTEGER;
BEGIN
  -- Get submission details
  SELECT * INTO v_submission FROM submissions WHERE id = p_submission_id;
  v_risk_count := COALESCE(array_length(v_submission.risk_flags, 1), 0);

  -- Iterate through active rules by priority
  FOR v_rule IN
    SELECT * FROM routing_rules
    WHERE active = true
    ORDER BY priority ASC
  LOOP
    v_matches := false;

    -- Check risk_flags contains condition
    IF v_rule.conditions ? 'risk_flags' AND v_rule.conditions->'risk_flags' ? 'contains' THEN
      DECLARE
        v_flag TEXT;
        v_required_flags TEXT[];
      BEGIN
        SELECT array_agg(value::TEXT) INTO v_required_flags
        FROM jsonb_array_elements_text(v_rule.conditions->'risk_flags'->'contains');

        FOREACH v_flag IN ARRAY v_required_flags LOOP
          IF v_flag = ANY(v_submission.risk_flags) THEN
            v_matches := true;
            EXIT;
          END IF;
        END LOOP;
      END;
    -- Check risk_count condition
    ELSIF v_rule.conditions ? 'risk_count' THEN
      IF v_rule.conditions->'risk_count' ? 'gte' THEN
        v_matches := v_risk_count >= (v_rule.conditions->'risk_count'->>'gte')::INTEGER;
      END IF;
    -- Empty conditions = catch-all rule
    ELSIF v_rule.conditions = '{}'::JSONB THEN
      v_matches := true;
    END IF;

    IF v_matches THEN
      -- Record the routing
      INSERT INTO submission_routing (submission_id, rule_id, routed_to_role, reason)
      VALUES (p_submission_id, v_rule.id, v_rule.route_to_role, 'Matched rule: ' || v_rule.name);

      rule_id := v_rule.id;
      rule_name := v_rule.name;
      routed_to := v_rule.route_to_role;
      RETURN NEXT;

      -- Only apply first matching rule (highest priority)
      EXIT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER TO AUTO-PROCESS NEW SUBMISSIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION process_new_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process on insert
  IF TG_OP = 'INSERT' THEN
    -- Perform AI triage
    PERFORM perform_ai_triage(NEW.id);

    -- Apply routing rules
    PERFORM apply_routing_rules(NEW.id);

    -- Initialize workflow
    PERFORM initialize_submission_workflow(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_process_submission ON submissions;
CREATE TRIGGER trigger_process_submission
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION process_new_submission();
