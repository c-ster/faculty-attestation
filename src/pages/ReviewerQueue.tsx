import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Loader2,
  Brain,
  ArrowRight,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

interface ReviewItem {
  id: string;
  submission_id: string;
  submission: {
    id: string;
    submission_id: string;
    title: string;
    authors: string[];
    department: string;
    created_at: string;
    risk_flags: string[] | null;
  };
  step_order: number;
  decision: string;
  assigned_at: string;
  due_date: string | null;
  ai_triage?: {
    risk_level: string;
    risk_score: number;
    detected_concerns: string[];
  };
}

interface WorkflowStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

const riskLevelConfig: Record<string, { label: string; className: string; icon: typeof AlertTriangle }> = {
  low: { label: "Low Risk", className: "bg-green-100 text-green-800", icon: CheckCircle },
  medium: { label: "Medium Risk", className: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  high: { label: "High Risk", className: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  critical: { label: "Critical Risk", className: "bg-red-100 text-red-800", icon: ShieldAlert },
};

const decisionConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending Review", className: "bg-blue-100 text-blue-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
  needs_revision: { label: "Needs Revision", className: "bg-yellow-100 text-yellow-800" },
  abstain: { label: "Abstained", className: "bg-gray-100 text-gray-800" },
};

const ReviewerQueue = () => {
  const { user } = useAuth();
  const { isLeadership, role, loading: roleLoading } = useUserRole();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WorkflowStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user || !isLeadership) return;

      setLoading(true);
      try {
        // Fetch reviews assigned to current user
        const { data: reviewData, error: reviewError } = await supabase
          .from("submission_reviews")
          .select(`
            id,
            submission_id,
            step_order,
            decision,
            assigned_at,
            due_date
          `)
          .eq("reviewer_id", user.id)
          .order("assigned_at", { ascending: false });

        if (reviewError) throw reviewError;

        // Fetch submission details for each review
        const submissionIds = reviewData?.map(r => r.submission_id) || [];

        if (submissionIds.length > 0) {
          const { data: submissions, error: subError } = await supabase
            .from("submissions")
            .select("id, submission_id, title, authors, department, created_at, risk_flags")
            .in("id", submissionIds);

          if (subError) throw subError;

          // Fetch AI triage data
          const { data: triageData } = await supabase
            .from("ai_triage_assessments")
            .select("submission_id, risk_level, risk_score, detected_concerns")
            .in("submission_id", submissionIds);

          // Combine data
          const combined: ReviewItem[] = (reviewData || []).map(review => {
            const submission = submissions?.find(s => s.id === review.submission_id);
            const triage = triageData?.find(t => t.submission_id === review.submission_id);
            return {
              ...review,
              submission: submission!,
              ai_triage: triage ? {
                risk_level: triage.risk_level,
                risk_score: triage.risk_score,
                detected_concerns: triage.detected_concerns,
              } : undefined,
            };
          }).filter(r => r.submission);

          setReviews(combined);

          // Calculate stats
          const pending = combined.filter(r => r.decision === "pending").length;
          const approved = combined.filter(r => r.decision === "approved").length;
          const rejected = combined.filter(r => r.decision === "rejected").length;
          setStats({ pending, approved, rejected, total: combined.length });
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!roleLoading) {
      fetchReviews();
    }
  }, [user, isLeadership, roleLoading]);

  const filteredReviews = reviews.filter(review => {
    if (activeTab === "pending") return review.decision === "pending";
    if (activeTab === "completed") return review.decision !== "pending";
    return true;
  });

  if (loading || roleLoading) {
    return (
      <Layout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isLeadership) {
    return (
      <Layout>
        <div className="page-container">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <ShieldAlert className="h-12 w-12 text-warning mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Reviewer Access Required</h2>
                <p className="text-muted-foreground mb-4">
                  The Reviewer Queue is available to department chairs, lab directors, vice provosts, and administrators.
                </p>
                <Button asChild>
                  <Link to="/submissions">View My Submissions</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reviewer Queue</h1>
            <p className="text-muted-foreground mt-1">
              Submissions assigned to you for review
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Role: {role?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <ClipboardList className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Assigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Clock className="h-6 w-6 text-yellow-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-100">
                  <XCircle className="h-6 w-6 text-red-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews Table */}
        <Card>
          <CardHeader>
            <CardTitle>Review Queue</CardTitle>
            <CardDescription>
              Submissions awaiting your review decision
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({stats.pending})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({stats.total - stats.pending})
                </TabsTrigger>
                <TabsTrigger value="all">
                  All ({stats.total})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {filteredReviews.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No reviews found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === "pending"
                    ? "You have no submissions pending review"
                    : "No reviews match this filter"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submission</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>AI Assessment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReviews.map((review) => {
                      const RiskIcon = review.ai_triage
                        ? riskLevelConfig[review.ai_triage.risk_level]?.icon || AlertTriangle
                        : AlertTriangle;

                      return (
                        <TableRow key={review.id}>
                          <TableCell>
                            <div>
                              <p className="font-mono text-xs text-muted-foreground">
                                {review.submission.submission_id}
                              </p>
                              <p className="font-medium text-foreground line-clamp-1">
                                {review.submission.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {review.submission.authors.slice(0, 2).join("; ")}
                                {review.submission.authors.length > 2 && " et al."}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {review.submission.department}
                          </TableCell>
                          <TableCell>
                            {review.ai_triage ? (
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${riskLevelConfig[review.ai_triage.risk_level]?.className || "bg-gray-100"}`}>
                                  <RiskIcon className="h-3 w-3" />
                                  {riskLevelConfig[review.ai_triage.risk_level]?.label || review.ai_triage.risk_level}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  <Brain className="h-3 w-3 mr-1" />
                                  {Math.round(review.ai_triage.risk_score * 100)}%
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not assessed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${decisionConfig[review.decision]?.className || "bg-gray-100"}`}>
                              {decisionConfig[review.decision]?.label || review.decision}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(review.assigned_at).toLocaleDateString()}
                            </div>
                            {review.due_date && (
                              <p className="text-xs text-warning">
                                Due: {new Date(review.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="default" size="sm" asChild>
                              <Link to={`/submissions/${review.submission.id}`}>
                                {review.decision === "pending" ? (
                                  <>
                                    Review
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </>
                                )}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ReviewerQueue;
