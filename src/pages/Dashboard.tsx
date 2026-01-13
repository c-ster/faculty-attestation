import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, FileText, CheckCircle, Clock, AlertTriangle, Download, TrendingUp, TrendingDown, Building2, Loader2, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Link } from "react-router-dom";

interface Submission {
  id: string;
  status: string;
  department: string;
  sponsor: string | null;
  risk_flags: string[] | null;
  created_at: string;
}

const COLORS = ['hsl(215, 80%, 15%)', 'hsl(43, 70%, 45%)', 'hsl(152, 60%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(215, 70%, 35%)', 'hsl(210, 20%, 70%)'];

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState("6m");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLeadership, loading: roleLoading } = useUserRole();

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("submissions")
          .select("id, status, department, sponsor, risk_flags, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSubmissions(data || []);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  // Filter submissions by time range
  const filteredSubmissions = useMemo(() => {
    const now = new Date();
    let cutoffDate = new Date();

    switch (timeRange) {
      case "1m":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "3m":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "6m":
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case "1y":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        cutoffDate.setMonth(now.getMonth() - 6);
    }

    return submissions.filter(
      (s) => new Date(s.created_at) >= cutoffDate
    );
  }, [submissions, timeRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredSubmissions.length;
    const released = filteredSubmissions.filter((s) => s.status === "released").length;
    const underReview = filteredSubmissions.filter((s) => s.status === "under_review").length;
    const withRiskFlags = filteredSubmissions.filter(
      (s) => s.risk_flags && s.risk_flags.length > 0
    ).length;

    return [
      { label: "Total Submissions", value: total.toLocaleString(), icon: FileText, color: "text-primary" },
      { label: "Released", value: released.toLocaleString(), icon: CheckCircle, color: "text-success" },
      { label: "Under Review", value: underReview.toLocaleString(), icon: Clock, color: "text-warning" },
      { label: "Risk Flags", value: withRiskFlags.toLocaleString(), icon: AlertTriangle, color: "text-destructive" },
    ];
  }, [filteredSubmissions]);

  // Submissions by month
  const submissionsByMonth = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    filteredSubmissions.forEach((s) => {
      const date = new Date(s.created_at);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    // Sort by date and take last 6 entries
    return Object.entries(monthCounts)
      .map(([month, submissions]) => ({ month: month.split(" ")[0], submissions }))
      .slice(-6);
  }, [filteredSubmissions]);

  // Submissions by department
  const submissionsByDepartment = useMemo(() => {
    const deptCounts: Record<string, number> = {};

    filteredSubmissions.forEach((s) => {
      const dept = s.department || "Unknown";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    return Object.entries(deptCounts)
      .map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredSubmissions]);

  // Submissions by sponsor
  const submissionsBySponsor = useMemo(() => {
    const sponsorCounts: Record<string, number> = {};

    filteredSubmissions.forEach((s) => {
      const sponsor = s.sponsor || "Not Specified";
      // Shorten sponsor names
      const shortName = sponsor.includes("(")
        ? sponsor.match(/\(([^)]+)\)/)?.[1] || sponsor.substring(0, 20)
        : sponsor.substring(0, 20);
      sponsorCounts[shortName] = (sponsorCounts[shortName] || 0) + 1;
    });

    return Object.entries(sponsorCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredSubmissions]);

  // Risk trends by month
  const riskTrends = useMemo(() => {
    const monthData: Record<string, { noRisk: number; lowRisk: number; highRisk: number }> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    filteredSubmissions.forEach((s) => {
      const date = new Date(s.created_at);
      const monthKey = months[date.getMonth()];

      if (!monthData[monthKey]) {
        monthData[monthKey] = { noRisk: 0, lowRisk: 0, highRisk: 0 };
      }

      const riskCount = s.risk_flags?.length || 0;
      if (riskCount === 0) {
        monthData[monthKey].noRisk++;
      } else if (riskCount <= 2) {
        monthData[monthKey].lowRisk++;
      } else {
        monthData[monthKey].highRisk++;
      }
    });

    return Object.entries(monthData)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6);
  }, [filteredSubmissions]);

  const handleExport = () => {
    // Create CSV content
    const headers = ["Submission ID", "Title", "Department", "Sponsor", "Status", "Risk Flags", "Created At"];
    const csvContent = [
      headers.join(","),
      ...filteredSubmissions.map((s) =>
        [
          s.id,
          `"${s.department}"`,
          `"${s.sponsor || "N/A"}"`,
          s.status,
          s.risk_flags?.length || 0,
          new Date(s.created_at).toLocaleDateString(),
        ].join(",")
      ),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
                <h2 className="text-xl font-semibold mb-2">Restricted Access</h2>
                <p className="text-muted-foreground mb-4">
                  The Leadership Dashboard is available to department chairs, lab directors, vice provosts, and administrators.
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
            <h1 className="text-3xl font-bold text-foreground">Leadership Dashboard</h1>
            <p className="text-muted-foreground mt-1">Institutional overview of public release submissions</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-secondary ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Submissions Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Submissions Over Time
              </CardTitle>
              <CardDescription>Monthly submission volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {submissionsByMonth.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={submissionsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="submissions" fill="hsl(215, 80%, 15%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Department */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Submissions by Department
              </CardTitle>
              <CardDescription>Distribution across schools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {submissionsByDepartment.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={submissionsByDepartment}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {submissionsByDepartment.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Indicators Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Indicators Trend
              </CardTitle>
              <CardDescription>Submissions by risk level over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {riskTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={riskTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="noRisk" name="No Risk" stroke="hsl(152, 60%, 40%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="lowRisk" name="Low Risk" stroke="hsl(38, 92%, 50%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="highRisk" name="High Risk" stroke="hsl(0, 72%, 51%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Sponsor */}
          <Card>
            <CardHeader>
              <CardTitle>Submissions by Sponsor</CardTitle>
              <CardDescription>Funding source distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissionsBySponsor.length > 0 ? (
                  submissionsBySponsor.map((sponsor, index) => {
                    const total = submissionsBySponsor.reduce((acc, s) => acc + s.value, 0);
                    const percentage = (sponsor.value / total) * 100;
                    return (
                      <div key={sponsor.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{sponsor.name}</span>
                          <span className="text-sm text-muted-foreground">{sponsor.value}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
};

export default Dashboard;
