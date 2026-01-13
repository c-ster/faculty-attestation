import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, FileText, Calendar, Clock, Eye, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SubmissionStatus = "submitted" | "under_review" | "released" | "not_released";

interface Submission {
  id: string;
  submission_id: string;
  title: string;
  authors: string[];
  department: string;
  created_at: string;
  status: SubmissionStatus;
  sponsor: string | null;
  risk_flags: string[];
}

const statusConfig: Record<SubmissionStatus, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "status-submitted" },
  under_review: { label: "Under Review", className: "status-review" },
  released: { label: "Released", className: "status-released" },
  not_released: { label: "Not Released", className: "status-not-released" },
};

const Submissions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!user) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching submissions:", error);
      } else {
        setSubmissions(data as Submission[]);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [user]);

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.submission_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="page-container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Submissions</h1>
            <p className="text-muted-foreground mt-1">View and track your manuscript submissions</p>
          </div>
          <Button asChild>
            <Link to="/submit">
              <FileText className="h-4 w-4 mr-2" />
              New Submission
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or submission ID..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="not_released">Not Released</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${filteredSubmissions.length} submission${filteredSubmissions.length !== 1 ? "s" : ""} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Submission ID</TableHead>
                        <TableHead className="min-w-[300px]">Title</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-mono text-sm">{submission.submission_id}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground line-clamp-1">{submission.title}</p>
                              <p className="text-xs text-muted-foreground">{submission.authors.join("; ")}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{submission.department}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(submission.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`status-badge ${statusConfig[submission.status].className}`}>
                              {statusConfig[submission.status].label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {submission.risk_flags && submission.risk_flags.length > 0 ? (
                              <Badge variant="outline" className="border-warning text-warning">
                                {submission.risk_flags.length} flag{submission.risk_flags.length > 1 ? "s" : ""}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/submissions/${submission.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredSubmissions.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground">No submissions found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Start by creating a new submission"}
                    </p>
                    {!searchQuery && statusFilter === "all" && (
                      <Button asChild className="mt-4">
                        <Link to="/submit">
                          <FileText className="h-4 w-4 mr-2" />
                          Create Your First Submission
                        </Link>
                      </Button>
                    )}
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

export default Submissions;
