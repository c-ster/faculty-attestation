import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Clock,
  Loader2,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import WorkflowStatusCard from "@/components/workflow/WorkflowStatusCard";
import AITriageCard from "@/components/workflow/AITriageCard";
import ReviewPanel from "@/components/workflow/ReviewPanel";

interface Submission {
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
  status: string;
  risk_flags: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface SelfCertification {
  contains_classified: boolean;
  contains_operational_info: boolean;
  contains_export_controlled: boolean;
  has_foreign_involvement: boolean;
  has_sponsor_restrictions: boolean;
  has_prior_release: boolean;
  has_coauthor_concurrence: boolean;
  attested_at: string | null;
}

type SubmissionStatus = "submitted" | "under_review" | "released" | "not_released";

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-800", icon: Clock },
  under_review: { label: "Under Review", className: "bg-yellow-100 text-yellow-800", icon: Clock },
  released: { label: "Released", className: "bg-green-100 text-green-800", icon: CheckCircle },
  not_released: { label: "Not Released", className: "bg-red-100 text-red-800", icon: XCircle },
};

const certificationLabels: Record<string, { label: string; riskOnYes: boolean }> = {
  contains_classified: { label: "Contains Classified Information", riskOnYes: true },
  contains_operational_info: { label: "Contains Operationally Sensitive Info", riskOnYes: true },
  contains_export_controlled: { label: "Contains Export Controlled Data", riskOnYes: true },
  has_foreign_involvement: { label: "Foreign Involvement", riskOnYes: false },
  has_sponsor_restrictions: { label: "Sponsor Requires Pre-Publication Review", riskOnYes: false },
  has_prior_release: { label: "Prior Release Approved", riskOnYes: false },
  has_coauthor_concurrence: { label: "Co-Author Concurrence Received", riskOnYes: false },
};

const SubmissionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLeadership, isAdmin } = useUserRole();
  const { toast } = useToast();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [certification, setCertification] = useState<SelfCertification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update state
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<SubmissionStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!id || !user) return;

      setLoading(true);
      try {
        // Leadership can view any submission, regular users only their own
        let query = supabase
          .from("submissions")
          .select("*")
          .eq("id", id);

        if (!isLeadership) {
          query = query.eq("user_id", user.id);
        }

        const { data: subData, error: subError } = await query.single();

        if (subError) throw subError;
        if (!subData) throw new Error("Submission not found");

        setSubmission(subData);

        // Fetch self-certification
        const { data: certData, error: certError } = await supabase
          .from("self_certifications")
          .select("*")
          .eq("submission_id", id)
          .single();

        if (!certError && certData) {
          setCertification(certData);
        }
      } catch (err) {
        console.error("Error fetching submission:", err);
        setError(err instanceof Error ? err.message : "Failed to load submission");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [id, user, isLeadership]);

  const handleDownloadManuscript = async () => {
    if (!submission?.manuscript_path) return;

    try {
      const { data, error } = await supabase.storage
        .from("manuscripts")
        .download(submission.manuscript_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = submission.manuscript_filename || "manuscript";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading manuscript:", err);
      toast({
        title: "Download Failed",
        description: "Could not download the manuscript.",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async () => {
    if (!submission || !newStatus || !user) return;

    setUpdatingStatus(true);
    try {
      // Update submission status
      const { error: updateError } = await supabase
        .from("submissions")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", submission.id);

      if (updateError) throw updateError;

      // Log the status change
      await supabase.from("attestation_logs").insert({
        submission_id: submission.id,
        user_id: user.id,
        action: "status_changed",
        previous_value: JSON.stringify({ status: submission.status }),
        new_value: JSON.stringify({ status: newStatus, note: statusNote }),
      });

      // Update local state
      setSubmission({ ...submission, status: newStatus });
      setShowStatusDialog(false);
      setNewStatus("");
      setStatusNote("");

      toast({
        title: "Status Updated",
        description: `Submission status changed to "${statusConfig[newStatus]?.label || newStatus}".`,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        title: "Update Failed",
        description: "Could not update the submission status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !submission) {
    return (
      <Layout>
        <div className="page-container">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Submission Not Found</h2>
                <p className="text-muted-foreground mb-4">{error || "The submission you're looking for doesn't exist."}</p>
                <Button asChild>
                  <Link to="/submissions">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Submissions
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const StatusIcon = statusConfig[submission.status]?.icon || Clock;
  const isOwner = submission.user_id === user?.id;

  return (
    <Layout>
      <div className="page-container max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {isLeadership && !isOwner && (
            <Badge variant="outline" className="text-muted-foreground">
              <Shield className="h-3 w-3 mr-1" />
              Viewing as reviewer
            </Badge>
          )}
        </div>

        {/* Title and Status */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-muted-foreground font-mono mb-2">{submission.submission_id}</p>
            <h1 className="text-2xl font-bold text-foreground">{submission.title}</h1>
            <p className="text-muted-foreground mt-1">{submission.authors.join("; ")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[submission.status]?.className || "bg-gray-100"}`}>
              <StatusIcon className="h-4 w-4" />
              {statusConfig[submission.status]?.label || submission.status}
            </span>
            {isLeadership && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewStatus(submission.status as SubmissionStatus);
                  setShowStatusDialog(true);
                }}
              >
                Change Status
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Submission Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submission Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Department</dt>
                  <dd className="font-medium flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {submission.department}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">School</dt>
                  <dd className="font-medium mt-1">{submission.school}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Sponsor</dt>
                  <dd className="font-medium mt-1">{submission.sponsor || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Funding Source</dt>
                  <dd className="font-medium mt-1">{submission.funding_source || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Target Venue</dt>
                  <dd className="font-medium mt-1">{submission.target_venue || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Submitted</dt>
                  <dd className="font-medium flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(submission.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              {submission.abstract && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <dt className="text-sm text-muted-foreground mb-2">Abstract</dt>
                    <dd className="text-sm leading-relaxed">{submission.abstract}</dd>
                  </div>
                </>
              )}

              {submission.manuscript_filename && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <dt className="text-sm text-muted-foreground">Manuscript</dt>
                      <dd className="font-medium mt-1">{submission.manuscript_filename}</dd>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadManuscript}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Risk Flags */}
          {submission.risk_flags && submission.risk_flags.length > 0 && (
            <Card className="border-warning/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Indicators ({submission.risk_flags.length})
                </CardTitle>
                <CardDescription>
                  These items may require additional review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {submission.risk_flags.map((flag) => (
                    <Badge key={flag} variant="outline" className="border-warning text-warning">
                      {flag.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Self-Certification */}
          {certification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Self-Certification Responses
                </CardTitle>
                {certification.attested_at && (
                  <CardDescription>
                    Attested on {new Date(certification.attested_at).toLocaleDateString()}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {Object.entries(certificationLabels).map(([key, config]) => {
                    const value = certification[key as keyof SelfCertification];
                    const isRisk = config.riskOnYes && value === true;

                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isRisk ? "bg-warning/10" : "bg-secondary"
                        }`}
                      >
                        <span className="text-sm">{config.label}</span>
                        <span className={`font-medium ${isRisk ? "text-warning" : ""}`}>
                          {value ? "Yes" : "No"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workflow & AI Triage Section (Leadership View) */}
          {isLeadership && (
            <div className="grid gap-6 lg:grid-cols-2">
              <WorkflowStatusCard submissionId={submission.id} />
              <AITriageCard submissionId={submission.id} />
            </div>
          )}

          {/* Review Panel (for assigned reviewers) */}
          {isLeadership && (
            <ReviewPanel submissionId={submission.id} />
          )}
        </div>

        {/* Status Update Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Submission Status</DialogTitle>
              <DialogDescription>
                Change the status for "{submission.title}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as SubmissionStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="not_released">Not Released</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Textarea
                  placeholder="Add a note about this status change..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={!newStatus || newStatus === submission.status || updatingStatus}
              >
                {updatingStatus ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default SubmissionDetail;
