import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Calendar,
  User,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  Download,
  Clock,
  Shield,
} from "lucide-react";
import { Link, useParams, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type WorkflowStep = Database["public"]["Enums"]["workflow_step"];
type ReviewDecision = Database["public"]["Enums"]["review_decision"];

interface SubmissionDetail {
  id: string;
  submission_id: string;
  title: string;
  authors: string[];
  department: string;
  school: string;
  abstract: string | null;
  sponsor: string | null;
  funding_source: string | null;
  target_venue: string | null;
  manuscript_path: string | null;
  manuscript_filename: string | null;
  created_at: string;
  status: string;
  risk_flags: string[] | null;
  current_step: WorkflowStep;
  user_id: string;
}

interface SelfCertification {
  contains_classified: boolean;
  classification_details: string | null;
  contains_operational_info: boolean;
  operational_details: string | null;
  contains_export_controlled: boolean;
  export_control_details: string | null;
  export_control_type: string | null;
  has_foreign_involvement: boolean;
  foreign_details: string | null;
  foreign_countries: string[] | null;
  has_sponsor_restrictions: boolean;
  sponsor_restriction_details: string | null;
  has_prior_release: boolean;
  prior_release_details: string | null;
  attested_accurate: boolean;
  attested_at: string | null;
}

interface ReviewRecord {
  id: string;
  workflow_step: WorkflowStep;
  decision: ReviewDecision;
  review_notes: string | null;
  revision_instructions: string | null;
  reviewed_at: string | null;
  reviewer_id: string;
}

interface SubmitterProfile {
  full_name: string;
  email: string;
}

const certificationQuestions = [
  { key: "contains_classified", label: "Contains Classified Information", detailKey: "classification_details" },
  { key: "contains_operational_info", label: "Contains Operational/Sensitive Information", detailKey: "operational_details" },
  { key: "contains_export_controlled", label: "Export Controlled (ITAR/EAR)", detailKey: "export_control_details" },
  { key: "has_foreign_involvement", label: "Foreign Involvement", detailKey: "foreign_details" },
  { key: "has_sponsor_restrictions", label: "Sponsor Pre-publication Restrictions", detailKey: "sponsor_restriction_details" },
  { key: "has_prior_release", label: "Prior Public Release", detailKey: "prior_release_details" },
];

const SubmissionReview = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLeadership, loading: roleLoading } = useUserRole();

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [certification, setCertification] = useState<SelfCertification | null>(null);
  const [submitterProfile, setSubmitterProfile] = useState<SubmitterProfile | null>(null);
  const [currentReview, setCurrentReview] = useState<ReviewRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [reviewNotes, setReviewNotes] = useState("");
  const [revisionInstructions, setRevisionInstructions] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!submissionId || !user) return;

      setLoading(true);

      // Fetch submission
      const { data: submissionData, error: submissionError } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (submissionError || !submissionData) {
        console.error("Error fetching submission:", submissionError);
        toast.error("Submission not found");
        navigate("/review");
        return;
      }

      setSubmission(submissionData as SubmissionDetail);

      // Fetch self-certification
      const { data: certData } = await supabase
        .from("self_certifications")
        .select("*")
        .eq("submission_id", submissionId)
        .single();

      if (certData) {
        setCertification(certData as SelfCertification);
      }

      // Fetch submitter profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", submissionData.user_id)
        .single();

      if (profileData) {
        setSubmitterProfile(profileData);
      }

      // Fetch current review (if assigned to this user)
      const { data: reviewData } = await supabase
        .from("reviews")
        .select("*")
        .eq("submission_id", submissionId)
        .eq("reviewer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (reviewData) {
        setCurrentReview(reviewData as ReviewRecord);
        setReviewNotes(reviewData.review_notes || "");
        setRevisionInstructions(reviewData.revision_instructions || "");
      }

      setLoading(false);
    };

    fetchData();
  }, [submissionId, user, navigate]);

  // Redirect non-leadership users
  if (!roleLoading && !isLeadership) {
    return <Navigate to="/submissions" replace />;
  }

  const handleDecision = async (decision: ReviewDecision) => {
    if (!currentReview || !submission) return;

    setSubmitting(true);

    try {
      // Update the review record
      const { error: reviewError } = await supabase
        .from("reviews")
        .update({
          decision,
          review_notes: reviewNotes || null,
          revision_instructions: decision === "returned_for_revision" ? revisionInstructions : null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", currentReview.id);

      if (reviewError) throw reviewError;

      // Call the advance_workflow function
      const { error: workflowError } = await supabase.rpc("advance_workflow", {
        _submission_id: submission.id,
        _decision: decision,
        _notes: reviewNotes || null,
      });

      if (workflowError) throw workflowError;

      toast.success(
        decision === "approved"
          ? "Submission approved successfully"
          : decision === "rejected"
            ? "Submission rejected"
            : "Submission returned for revision"
      );

      navigate("/review");
    } catch (error) {
      console.error("Error processing decision:", error);
      toast.error("Failed to process decision. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <Layout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!submission) {
    return (
      <Layout>
        <div className="page-container">
          <p>Submission not found</p>
        </div>
      </Layout>
    );
  }

  const canReview = currentReview && currentReview.decision === "pending";

  return (
    <Layout>
      <div className="page-container">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/review">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Review Submission</h1>
              <Badge variant="outline" className="font-mono">
                {submission.submission_id}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {canReview ? "Review and make a decision on this submission" : "View submission details"}
            </p>
          </div>
          {submission.risk_flags && submission.risk_flags.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {submission.risk_flags.length} Risk Flag{submission.risk_flags.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Manuscript Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manuscript Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{submission.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {submission.authors.join("; ")}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{submission.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">School</p>
                    <p className="font-medium">{submission.school}</p>
                  </div>
                  {submission.sponsor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Sponsor</p>
                      <p className="font-medium">{submission.sponsor}</p>
                    </div>
                  )}
                  {submission.funding_source && (
                    <div>
                      <p className="text-sm text-muted-foreground">Funding Source</p>
                      <p className="font-medium">{submission.funding_source}</p>
                    </div>
                  )}
                  {submission.target_venue && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Target Venue</p>
                      <p className="font-medium">{submission.target_venue}</p>
                    </div>
                  )}
                </div>

                {submission.abstract && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Abstract</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{submission.abstract}</p>
                    </div>
                  </>
                )}

                {submission.manuscript_filename && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Manuscript File</p>
                        <p className="font-medium">{submission.manuscript_filename}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Self-Certification Responses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Self-Certification Responses
                </CardTitle>
                <CardDescription>
                  Submitter's responses to security and compliance questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {certification ? (
                  <div className="space-y-4">
                    {certificationQuestions.map((q) => {
                      const value = certification[q.key as keyof SelfCertification] as boolean;
                      const details = certification[q.detailKey as keyof SelfCertification] as string | null;
                      const isRisk = value && q.key !== "has_prior_release";

                      return (
                        <div key={q.key} className={`p-4 rounded-lg ${isRisk ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{q.label}</span>
                            <Badge variant={isRisk ? "destructive" : value ? "secondary" : "outline"}>
                              {value ? "Yes" : "No"}
                            </Badge>
                          </div>
                          {details && (
                            <p className="text-sm text-muted-foreground mt-2">{details}</p>
                          )}
                        </div>
                      );
                    })}

                    <Separator />

                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>
                        Attested accurate on {certification.attested_at
                          ? new Date(certification.attested_at).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No certification data available</p>
                )}
              </CardContent>
            </Card>

            {/* Review Decision (only if canReview) */}
            {canReview && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Decision</CardTitle>
                  <CardDescription>
                    Review the submission and make your decision
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Review Notes (Optional)</label>
                    <Textarea
                      placeholder="Add any notes about your review..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* Approve */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Submission?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will advance the submission to the next stage of review or release it for publication.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleDecision("approved")}
                          >
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Return for Revision */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" disabled={submitting}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Return for Revision
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Return for Revision?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The submitter will be notified to revise and resubmit.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <label className="text-sm font-medium">Revision Instructions</label>
                          <Textarea
                            placeholder="Explain what changes are needed..."
                            value={revisionInstructions}
                            onChange={(e) => setRevisionInstructions(e.target.value)}
                            className="mt-2"
                            rows={4}
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => handleDecision("returned_for_revision")}
                          >
                            Return for Revision
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Reject */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={submitting}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Submission?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the submission as not released. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDecision("rejected")}
                          >
                            Reject
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submitter Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Submitter
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submitterProfile ? (
                  <div>
                    <p className="font-medium">{submitterProfile.full_name}</p>
                    <p className="text-sm text-muted-foreground">{submitterProfile.email}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Unknown</p>
                )}
              </CardContent>
            </Card>

            {/* Submission Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Submission Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">{new Date(submission.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Step</p>
                  <Badge variant="outline">
                    {submission.current_step === "chair_review"
                      ? "Chair Review"
                      : submission.current_step === "vice_provost_review"
                        ? "VP Review"
                        : submission.current_step}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{submission.status}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Review Status */}
            {currentReview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Your Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      className={
                        currentReview.decision === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : currentReview.decision === "approved"
                            ? "bg-green-100 text-green-800"
                            : currentReview.decision === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-orange-100 text-orange-800"
                      }
                    >
                      {currentReview.decision === "pending"
                        ? "Pending"
                        : currentReview.decision === "approved"
                          ? "Approved"
                          : currentReview.decision === "rejected"
                            ? "Rejected"
                            : "Returned"}
                    </Badge>
                  </div>
                  {currentReview.reviewed_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Reviewed On</p>
                      <p className="font-medium">{new Date(currentReview.reviewed_at).toLocaleDateString()}</p>
                    </div>
                  )}
                  {currentReview.review_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{currentReview.review_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Risk Flags Detail */}
            {submission.risk_flags && submission.risk_flags.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Risk Flags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {submission.risk_flags.map((flag, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SubmissionReview;
