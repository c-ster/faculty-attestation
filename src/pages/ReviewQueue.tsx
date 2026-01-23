import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  FileText,
  Loader2,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import type { Database } from "@/integrations/supabase/types";

type WorkflowStep = Database["public"]["Enums"]["workflow_step"];
type ReviewDecision = Database["public"]["Enums"]["review_decision"];

interface ReviewItem {
  id: string;
  submission_id: string;
  reviewer_id: string;
  workflow_step: WorkflowStep;
  decision: ReviewDecision;
  assigned_at: string;
  due_date: string | null;
  submission: {
    id: string;
    submission_id: string;
    title: string;
    authors: string[];
    department: string;
    school: string;
    created_at: string;
    risk_flags: string[] | null;
    user_id: string;
    abstract: string | null;
  };
  submitter_profile?: {
    full_name: string;
    email: string;
  };
}

const workflowStepLabels: Record<WorkflowStep, string> = {
  submitted: "Submitted",
  chair_review: "Chair Review",
  vice_provost_review: "VP Review",
  completed: "Completed",
};

const decisionConfig: Record<ReviewDecision, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approved", className: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800", icon: XCircle },
  returned_for_revision: { label: "Returned", className: "bg-orange-100 text-orange-800", icon: RotateCcw },
};

const ReviewQueue = () => {
  const { user } = useAuth();
  const { role, isLeadership, loading: roleLoading } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user || roleLoading) return;

      setLoading(true);

      // Fetch reviews assigned to this user
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          id,
          submission_id,
          reviewer_id,
          workflow_step,
          decision,
          assigned_at,
          due_date
        `)
        .eq("reviewer_id", user.id)
        .order("assigned_at", { ascending: false });

      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
        setLoading(false);
        return;
      }

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        setLoading(false);
        return;
      }

      // Fetch submission details for each review
      const submissionIds = reviewsData.map(r => r.submission_id);
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select("id, submission_id, title, authors, department, school, created_at, risk_flags, user_id, abstract")
        .in("id", submissionIds);

      if (submissionsError) {
        console.error("Error fetching submissions:", submissionsError);
        setLoading(false);
        return;
      }

      // Fetch submitter profiles
      const userIds = submissionsData?.map(s => s.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      // Combine the data
      const combinedData: ReviewItem[] = reviewsData.map(review => {
        const submission = submissionsData?.find(s => s.id === review.submission_id);
        const profile = profilesData?.find(p => p.user_id === submission?.user_id);
        return {
          ...review,
          submission: submission!,
          submitter_profile: profile ? { full_name: profile.full_name, email: profile.email } : undefined,
        };
      }).filter(r => r.submission);

      setReviews(combinedData);
      setLoading(false);
    };

    fetchReviews();
  }, [user, roleLoading]);

  // Redirect non-leadership users
  if (!roleLoading && !isLeadership) {
    return <Navigate to="/submissions" replace />;
  }

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.submission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.submission.submission_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (review.submitter_profile?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesDepartment = departmentFilter === "all" || review.submission.department === departmentFilter;

    const matchesTab = activeTab === "all" ||
      (activeTab === "pending" && review.decision === "pending") ||
      (activeTab === "completed" && review.decision !== "pending");

    return matchesSearch && matchesDepartment && matchesTab;
  });

  const pendingCount = reviews.filter(r => r.decision === "pending").length;
  const completedCount = reviews.filter(r => r.decision !== "pending").length;
  const overdueCount = reviews.filter(r =>
    r.decision === "pending" &&
    r.due_date &&
    new Date(r.due_date) < new Date()
  ).length;

  // Get unique departments for filter
  const departments = [...new Set(reviews.map(r => r.submission.department))];

  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Layout>
      <div className="page-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Review Queue</h1>
            <p className="text-muted-foreground mt-1">
              {role === "vice_provost" ? "Vice Provost" : role === "chair" ? "Department Chair" : "Leadership"} review queue for manuscript submissions
            </p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline">
              View Dashboard
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-100">
                  <Clock className="h-5 w-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedCount}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueCount}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, ID, or submitter..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Table */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedCount})
                </TabsTrigger>
                <TabsTrigger value="all">
                  All ({reviews.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loading || roleLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Submission</TableHead>
                        <TableHead>Submitter</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReviews.map((review) => {
                        const DecisionIcon = decisionConfig[review.decision].icon;
                        return (
                          <TableRow key={review.id}>
                            <TableCell>
                              <div>
                                <p className="font-mono text-xs text-muted-foreground">
                                  {review.submission.submission_id}
                                </p>
                                <p className="font-medium text-foreground line-clamp-1 max-w-[250px]">
                                  {review.submission.title}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {review.submitter_profile?.full_name || "Unknown"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{review.submission.department}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(review.assigned_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              {review.due_date ? (
                                <div className={`flex items-center gap-1 text-sm ${isOverdue(review.due_date) && review.decision === "pending" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                  <Clock className="h-3 w-3" />
                                  {new Date(review.due_date).toLocaleDateString()}
                                  {isOverdue(review.due_date) && review.decision === "pending" && (
                                    <Badge variant="destructive" className="ml-1 text-xs">Overdue</Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {review.submission.risk_flags && review.submission.risk_flags.length > 0 ? (
                                <Badge variant="outline" className="border-warning text-warning">
                                  {review.submission.risk_flags.length} flag{review.submission.risk_flags.length > 1 ? "s" : ""}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={decisionConfig[review.decision].className}>
                                <DecisionIcon className="h-3 w-3 mr-1" />
                                {decisionConfig[review.decision].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button asChild variant={review.decision === "pending" ? "default" : "ghost"} size="sm">
                                <Link to={`/review/${review.submission.id}`}>
                                  {review.decision === "pending" ? (
                                    <>
                                      Review
                                      <ArrowRight className="h-4 w-4 ml-1" />
                                    </>
                                  ) : (
                                    "View"
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

                {filteredReviews.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground">No reviews found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery || departmentFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : activeTab === "pending"
                          ? "You have no pending reviews at this time"
                          : "No reviews match the current filter"}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ReviewQueue;
