import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type NotificationType = Database["public"]["Enums"]["notification_type"];

interface NotificationParams {
  userId: string;
  submissionId?: string;
  type: NotificationType;
  title: string;
  message: string;
  emailTo?: string;
}

/**
 * Creates a notification record in the database
 */
export async function createNotification(params: NotificationParams): Promise<{
  success: boolean;
  notificationId?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: params.userId,
        submission_id: params.submissionId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        email_to: params.emailTo || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, notificationId: data.id };
  } catch (error) {
    console.error("Notification creation error:", error);
    return { success: false, error: "Unexpected error creating notification" };
  }
}

/**
 * Sends notification when a submission is received
 */
export async function notifySubmissionReceived(
  submitterId: string,
  submissionId: string,
  submissionIdCode: string,
  title: string
): Promise<void> {
  // Get submitter email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("user_id", submitterId)
    .single();

  await createNotification({
    userId: submitterId,
    submissionId,
    type: "submission_received",
    title: "Submission Received",
    message: `Your manuscript "${title}" has been received and assigned submission ID ${submissionIdCode}. It will be reviewed by your department chair.`,
    emailTo: profile?.email,
  });
}

/**
 * Sends notification when a review is assigned
 */
export async function notifyReviewAssigned(
  reviewerId: string,
  submissionId: string,
  submissionIdCode: string,
  title: string,
  submitterName: string
): Promise<void> {
  // Get reviewer email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("user_id", reviewerId)
    .single();

  await createNotification({
    userId: reviewerId,
    submissionId,
    type: "review_assigned",
    title: "New Review Assigned",
    message: `You have been assigned to review "${title}" (${submissionIdCode}) submitted by ${submitterName}. Please complete your review within 7 days.`,
    emailTo: profile?.email,
  });
}

/**
 * Sends notification when a review is completed (approved/rejected)
 */
export async function notifyReviewCompleted(
  submitterId: string,
  submissionId: string,
  submissionIdCode: string,
  title: string,
  decision: "approved" | "rejected",
  isFinal: boolean
): Promise<void> {
  // Get submitter email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("user_id", submitterId)
    .single();

  const decisionText = decision === "approved"
    ? isFinal
      ? "has been approved for public release"
      : "has been approved and advanced to the next review stage"
    : "has not been approved for public release";

  await createNotification({
    userId: submitterId,
    submissionId,
    type: isFinal ? "final_decision" : "review_completed",
    title: isFinal
      ? `Final Decision: ${decision === "approved" ? "Released" : "Not Released"}`
      : "Review Stage Completed",
    message: `Your manuscript "${title}" (${submissionIdCode}) ${decisionText}.`,
    emailTo: profile?.email,
  });
}

/**
 * Sends notification when revision is requested
 */
export async function notifyRevisionRequested(
  submitterId: string,
  submissionId: string,
  submissionIdCode: string,
  title: string,
  instructions: string
): Promise<void> {
  // Get submitter email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("user_id", submitterId)
    .single();

  await createNotification({
    userId: submitterId,
    submissionId,
    type: "revision_requested",
    title: "Revision Requested",
    message: `Your manuscript "${title}" (${submissionIdCode}) requires revision before it can proceed. Instructions: ${instructions || "Please contact the reviewer for details."}`,
    emailTo: profile?.email,
  });
}

/**
 * Gets unread notifications for a user
 */
export async function getUnreadNotifications(userId: string): Promise<{
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    created_at: string;
    submission_id: string | null;
  }>;
  count: number;
}> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, created_at, submission_id")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], count: 0 };
  }

  return { notifications: data || [], count: data?.length || 0 };
}

/**
 * Marks a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  return !error;
}

/**
 * Marks all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  return !error;
}
