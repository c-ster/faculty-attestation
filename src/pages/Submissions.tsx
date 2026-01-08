import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, FileText, Calendar, Clock, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

type SubmissionStatus = "submitted" | "under_review" | "released" | "not_released";

interface Submission {
  id: string;
  title: string;
  authors: string;
  department: string;
  submittedDate: string;
  status: SubmissionStatus;
  sponsor: string;
  riskIndicators: number;
}

const mockSubmissions: Submission[] = [
  {
    id: "NPS-M8K7L2",
    title: "Machine Learning Applications in Naval Warfare Simulation",
    authors: "Smith, J.; Johnson, A.; Williams, R.",
    department: "Computer Science",
    submittedDate: "2025-01-05",
    status: "released",
    sponsor: "ONR",
    riskIndicators: 0,
  },
  {
    id: "NPS-P4N9Q1",
    title: "Autonomous Underwater Vehicle Navigation Systems",
    authors: "Smith, J.; Chen, L.",
    department: "Mechanical Engineering",
    submittedDate: "2025-01-03",
    status: "under_review",
    sponsor: "DARPA",
    riskIndicators: 1,
  },
  {
    id: "NPS-X2R5T8",
    title: "Cybersecurity Threat Analysis for Maritime Networks",
    authors: "Smith, J.; Davis, M.; Brown, K.",
    department: "Computer Science",
    submittedDate: "2024-12-28",
    status: "submitted",
    sponsor: "NSF",
    riskIndicators: 2,
  },
  {
    id: "NPS-H6Y3W9",
    title: "Weather Prediction Models for Naval Operations",
    authors: "Smith, J.",
    department: "Meteorology",
    submittedDate: "2024-12-15",
    status: "released",
    sponsor: "NOAA",
    riskIndicators: 0,
  },
  {
    id: "NPS-B1C4D7",
    title: "Radar Signal Processing Techniques",
    authors: "Smith, J.; Lee, S.; Park, H.",
    department: "Electrical Engineering",
    submittedDate: "2024-12-10",
    status: "not_released",
    sponsor: "ONR",
    riskIndicators: 3,
  },
];

const statusConfig: Record<SubmissionStatus, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "status-submitted" },
  under_review: { label: "Under Review", className: "status-review" },
  released: { label: "Released", className: "status-released" },
  not_released: { label: "Not Released", className: "status-not-released" },
};

const Submissions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredSubmissions = mockSubmissions.filter((sub) => {
    const matchesSearch = sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.id.toLowerCase().includes(searchQuery.toLowerCase());
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
              {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      <TableCell className="font-mono text-sm">{submission.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground line-clamp-1">{submission.title}</p>
                          <p className="text-xs text-muted-foreground">{submission.authors}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{submission.department}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(submission.submittedDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`status-badge ${statusConfig[submission.status].className}`}>
                          {statusConfig[submission.status].label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {submission.riskIndicators > 0 ? (
                          <Badge variant="outline" className="border-warning text-warning">
                            {submission.riskIndicators} flag{submission.riskIndicators > 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Submissions;
