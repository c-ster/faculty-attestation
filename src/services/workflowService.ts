import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type WorkflowStep = Database["public"]["Enums"]["workflow_step"];
type AppRole = Database["public"]["Enums"]["app_role"];

interface Submission {
  id: string;
  submission_id: string;
  department: string;
  school: string;
  risk_flags: string[] | null;
  current_step: WorkflowStep;
  user_id: string;
  title: string;
}

interface RoutingRule {
  id: string;
  department: string | null;
  school: string | null;
  has_risk_flags: boolean | null;
  risk_flag_types: string[] | null;
  assign_to_role: AppRole;
  assign_to_user_id: string | null;
  priority: number;
  is_active: boolean;
}

/**
 * Finds the appropriate reviewer for a submission based on routing rules
 */
export async function findReviewer(
  submission: Submission,
  targetRole: AppRole
): Promise<string | null> {
  // First, try to find a matching routing rule
  const { data: rules } = await supabase
    .from("routing_rules")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (rules && rules.length > 0) {
    // Find the first matching rule
    const matchingRule = rules.find((rule: RoutingRule) => {
      // Check department match
      if (rule.department && rule.department !== submission.department) {
        return false;
      }
      // Check school match
      if (rule.school && rule.school !== submission.school) {
        return false;
      }
      // Check risk flags match
      if (rule.has_risk_flags !== null) {
        const hasFlags = (submission.risk_flags?.length ?? 0) > 0;
        if (rule.has_risk_flags !== hasFlags) {
          return false;
        }
      }
      // Check if rule assigns to the role we need
      if (rule.assign_to_role !== targetRole) {
        return false;
      }
      return true;
    });

    // If rule specifies a specific user, use that
    if (matchingRule?.assign_to_user_id) {
      return matchingRule.assign_to_user_id;
    }
  }

  // Fall back to finding any user with the target role in the same department
  const { data: roleUsers } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", targetRole);

  if (!roleUsers || roleUsers.length === 0) {
    return null;
  }

  // For chair/lab_director, prefer someone in the same department
  if (targetRole === "chair" || targetRole === "lab_director") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("department", submission.department)
      .in(
        "user_id",
        roleUsers.map((r) => r.user_id)
      );

    if (profiles && profiles.length > 0) {
      return profiles[0].user_id;
    }
  }

  // For vice_provost/admin, just return any user with that role
  return roleUsers[0].user_id;
}

/**
 * Determines the target role based on current workflow step
 */
function getTargetRoleForStep(step: WorkflowStep): AppRole | null {
  switch (step) {
    case "submitted":
      return "chair";
    case "chair_review":
      return "vice_provost";
    default:
      return null;
  }
}

/**
 * Initiates the workflow for a newly submitted manuscript
 * - Determines the first reviewer based on routing rules
 * - Creates a review record
 * - Updates the submission with assigned reviewer
 */
export async function initiateWorkflow(submissionId: string): Promise<{
  success: boolean;
  reviewerId?: string;
  error?: string;
}> {
  try {
    // Fetch the submission
    const { data: submission, error: fetchError } = await supabase
      .from("submissions")
      .select("id, submission_id, department, school, risk_flags, current_step, user_id, title")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      return { success: false, error: "Submission not found" };
    }

    // Determine target role based on current step
    const targetRole = getTargetRoleForStep(submission.current_step as WorkflowStep);
    if (!targetRole) {
      return { success: false, error: "No target role for current step" };
    }

    // Find appropriate reviewer
    const reviewerId = await findReviewer(submission as Submission, targetRole);
    if (!reviewerId) {
      // No reviewer available - submission stays in queue without assignment
      console.warn(`No reviewer found for submission ${submissionId}`);
      return { success: true, reviewerId: undefined };
    }

    // Determine the workflow step for the review
    const reviewStep: WorkflowStep = targetRole === "chair" ? "chair_review" : "vice_provost_review";

    // Create review record
    const { error: reviewError } = await supabase.from("reviews").insert({
      submission_id: submissionId,
      reviewer_id: reviewerId,
      workflow_step: reviewStep,
      decision: "pending",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    });

    if (reviewError) {
      console.error("Error creating review:", reviewError);
      return { success: false, error: "Failed to create review record" };
    }

    // Update submission with assigned reviewer and advance to review step
    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        assigned_to: reviewerId,
        current_step: reviewStep,
        status: "under_review",
        review_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Error updating submission:", updateError);
      return { success: false, error: "Failed to update submission" };
    }

    return { success: true, reviewerId };
  } catch (error) {
    console.error("Workflow initiation error:", error);
    return { success: false, error: "Unexpected error during workflow initiation" };
  }
}

/**
 * Advances the workflow after a review decision
 * This is called from the SubmissionReview page after a decision is made
 */
export async function advanceWorkflow(
  submissionId: string,
  decision: "approved" | "rejected" | "returned_for_revision"
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch current submission state
    const { data: submission, error: fetchError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      return { success: false, error: "Submission not found" };
    }

    const currentStep = submission.current_step as WorkflowStep;

    if (decision === "approved") {
      // Determine next step
      if (currentStep === "chair_review") {
        // Move to VP review
        const vpReviewerId = await findReviewer(submission as Submission, "vice_provost");

        if (vpReviewerId) {
          // Create new review for VP
          await supabase.from("reviews").insert({
            submission_id: submissionId,
            reviewer_id: vpReviewerId,
            workflow_step: "vice_provost_review",
            decision: "pending",
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

          await supabase
            .from("submissions")
            .update({
              current_step: "vice_provost_review",
              assigned_to: vpReviewerId,
              review_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", submissionId);
        }
      } else if (currentStep === "vice_provost_review") {
        // Final approval - mark as released
        await supabase
          .from("submissions")
          .update({
            current_step: "completed",
            status: "released",
            assigned_to: null,
            workflow_completed_at: new Date().toISOString(),
          })
          .eq("id", submissionId);
      }
    } else if (decision === "rejected") {
      // Mark as not released
      await supabase
        .from("submissions")
        .update({
          current_step: "completed",
          status: "not_released",
          assigned_to: null,
          workflow_completed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
    } else if (decision === "returned_for_revision") {
      // Return to submitter
      await supabase
        .from("submissions")
        .update({
          current_step: "submitted",
          status: "submitted",
          assigned_to: null,
        })
        .eq("id", submissionId);
    }

    return { success: true };
  } catch (error) {
    console.error("Workflow advance error:", error);
    return { success: false, error: "Unexpected error advancing workflow" };
  }
}
