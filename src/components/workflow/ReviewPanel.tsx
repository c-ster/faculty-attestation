import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Loader2,
  Send,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SubmissionReview {
  id: string;
  step_order: number;
  decision: string;
  recommendation: string | null;
  comments: string | null;
  assigned_at: string;
  reviewed_at: string | null;
  due_date: string | null;
  reviewer_id: string;
  reviewer?: {
    full_name: string;
    department: string | null;
  };
}

interface Props {
  submissionId: string;
  onReviewSubmitted?: () => void;
}

const decisionOptions = [
  { value: "approved", label: "Approve", description: "Approve for public release", icon: CheckCircle, color: "text-green-600" },
  { value: "rejected", label: "Reject", description: "Deny public release", icon: XCircle, color: "text-red-600" },
  { value: "needs_revision", label: "Request Revision", description: "Return for corrections", icon: AlertCircle, color: "text-yellow-600" },
  { value: "abstain", label: "Abstain", description: "Recuse from review", icon: Clock, color: "text-gray-600" },
];

const decisionConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-blue-100 text-blue-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
  needs_revision: { label: "Needs Revision", className: "bg-yellow-100 text-yellow-800" },
  abstain: { label: "Abstained", className: "bg-gray-100 text-gray-800" },
};

const ReviewPanel = ({ submissionId, onReviewSubmitted }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [review, setReview] = useState<SubmissionReview | null>(null);
  const [allReviews, setAllReviews] = useState<SubmissionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [decision, setDecision] = useState<string>("");
  const [recommendation, setRecommendation] = useState("");
  const [comments, setComments] = useState("");

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Fetch current user's review
        const { data: myReview, error: myError } = await supabase
          .from("submission_reviews")
          .select("*")
          .eq("submission_id", submissionId)
          .eq("reviewer_id", user.id)
          .single();

        if (!myError && myReview) {
          setReview(myReview);
          setDecision(myReview.decision);
          setRecommendation(myReview.recommendation || "");
          setComments(myReview.comments || "");
        }

        // Fetch all reviews for this submission (for display)
        const { data: reviews } = await supabase
          .from("submission_reviews")
          .select("*")
          .eq("submission_id", submissionId)
          .order("step_order", { ascending: true });

        if (reviews && reviews.length > 0) {
          // Fetch reviewer profiles
          const reviewerIds = reviews.map(r => r.reviewer_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, department")
            .in("user_id", reviewerIds);

          const reviewsWithProfiles = reviews.map(r => ({
            ...r,
            reviewer: profiles?.find(p => p.user_id === r.reviewer_id),
          }));

          setAllReviews(reviewsWithProfiles);
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [submissionId, user]);

  const handleSubmitReview = async () => {
    if (!review || !user || !decision) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("submission_reviews")
        .update({
          decision,
          recommendation: recommendation.trim() || null,
          comments: comments.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", review.id);

      if (error) throw error;

      // Log the review action
      await supabase.from("attestation_logs").insert({
        submission_id: submissionId,
        user_id: user.id,
        action: "review_submitted",
        new_value: JSON.stringify({ decision, recommendation, comments }),
      });

      toast({
        title: "Review Submitted",
        description: "Your review has been recorded successfully.",
      });

      // Update local state
      setReview({ ...review, decision, recommendation, comments, reviewed_at: new Date().toISOString() });

      onReviewSubmitted?.();
    } catch (err) {
      console.error("Error submitting review:", err);
      toast({
        title: "Submission Failed",
        description: "Could not submit your review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show review form if current user has a pending review
  const showForm = review && review.decision === "pending";
  const hasCompletedReview = review && review.decision !== "pending";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Review Panel
        </CardTitle>
        <CardDescription>
          {showForm
            ? "Submit your review decision for this submission"
            : hasCompletedReview
            ? "Your review has been submitted"
            : "Review history for this submission"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Your Review Section */}
        {review && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-4">Your Review</h4>

            {showForm ? (
              <div className="space-y-6">
                {/* Decision Selection */}
                <div className="space-y-3">
                  <Label>Decision *</Label>
                  <RadioGroup value={decision} onValueChange={setDecision}>
                    <div className="grid grid-cols-2 gap-3">
                      {decisionOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <label
                            key={option.value}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              decision === option.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-secondary"
                            }`}
                          >
                            <RadioGroupItem value={option.value} className="mt-0.5" />
                            <div className="flex-1">
                              <div className={`flex items-center gap-2 font-medium ${option.color}`}>
                                <Icon className="h-4 w-4" />
                                {option.label}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {option.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </RadioGroup>
                </div>

                {/* Recommendation */}
                <div className="space-y-2">
                  <Label htmlFor="recommendation">Recommendation</Label>
                  <Textarea
                    id="recommendation"
                    placeholder="Provide your recommendation for this submission..."
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Comments */}
                <div className="space-y-2">
                  <Label htmlFor="comments">Additional Comments</Label>
                  <Textarea
                    id="comments"
                    placeholder="Any additional comments or concerns..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitReview}
                    disabled={!decision || submitting}
                    size="lg"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Review
                  </Button>
                </div>
              </div>
            ) : hasCompletedReview ? (
              <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={decisionConfig[review.decision]?.className || "bg-gray-100"}>
                    {decisionConfig[review.decision]?.label || review.decision}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Reviewed on {new Date(review.reviewed_at!).toLocaleDateString()}
                  </span>
                </div>
                {review.recommendation && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Recommendation:</p>
                    <p className="text-sm">{review.recommendation}</p>
                  </div>
                )}
                {review.comments && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Comments:</p>
                    <p className="text-sm">{review.comments}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Other Reviews */}
        {allReviews.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="text-sm font-medium mb-4">Review History</h4>
              <div className="space-y-3">
                {allReviews.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-lg border ${
                      r.reviewer_id === user?.id ? "bg-primary/5 border-primary/20" : "bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {r.reviewer?.full_name || "Reviewer"}
                            {r.reviewer_id === user?.id && " (You)"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Step {r.step_order} {r.reviewer?.department && `• ${r.reviewer.department}`}
                          </p>
                        </div>
                      </div>
                      <Badge className={decisionConfig[r.decision]?.className || "bg-gray-100"}>
                        {decisionConfig[r.decision]?.label || r.decision}
                      </Badge>
                    </div>
                    {r.decision !== "pending" && r.reviewed_at && (
                      <p className="text-xs text-muted-foreground">
                        Reviewed on {new Date(r.reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!review && allReviews.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reviews have been assigned for this submission yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewPanel;
