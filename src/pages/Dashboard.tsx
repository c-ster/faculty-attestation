import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, FileText, CheckCircle, Clock, AlertTriangle, Download, Building2, Loader2, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Link } from "react-router-dom";

interface DashboardStats {
  total: number;
  released: number;
  under_review: number;
  submitted: number;
  not_released: number;
  with_risk_flags: number;
  by_department: { name: string; value: number }[] | null;
  by_month: { month: string; submissions: number }[] | null;
  by_sponsor: { name: string; value: number }[] | null;
}

const COLORS = ['hsl(215, 80%, 15%)', 'hsl(43, 70%, 45%)', 'hsl(152, 60%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(215, 70%, 35%)', 'hsl(210, 20%, 70%)'];

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState("6m");
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { isLeadership, loading: roleLoading } = useUserRole();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Convert time range to months
        const monthsMap: Record<string, number> = {
          "1m": 1,
          "3m": 3,
          "6m": 6,
          "1y": 12,
        };
        const months = monthsMap[timeRange] || 6;

        // Try to use the RPC function first (bypasses RLS)
        console.log("Calling get_leadership_stats RPC with months:", months);
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_leadership_stats",
          { time_range_months: months }
        );
        console.log("get_leadership_stats response:", { rpcData, rpcError });

        if (rpcError) {
          console.error("RPC error, falling back to direct query:", rpcError);
          // Fallback to direct query
          const { data, error } = await supabase
            .from("submissions")
            .select("id, status, department, sponsor, risk_flags, created_at")
            .order("created_at", { ascending: false });

          if (error) throw error;

          // Calculate stats from raw data
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - months);

          const filtered = (data || []).filter(
            (s) => new Date(s.created_at) >= cutoffDate
          );

          // Calculate department counts
          const deptCounts: Record<string, number> = {};
          filtered.forEach((s) => {
            const dept = s.department || "Unknown";
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
          });

          // Calculate sponsor counts
          const sponsorCounts: Record<string, number> = {};
          filtered.forEach((s) => {
            const sponsor = s.sponsor || "Not Specified";
            sponsorCounts[sponsor] = (sponsorCounts[sponsor] || 0) + 1;
          });

          // Calculate monthly counts
          const monthCounts: Record<string, number> = {};
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          filtered.forEach((s) => {
            const date = new Date(s.created_at);
            const monthKey = monthNames[date.getMonth()];
            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
          });

          setDashboardStats({
            total: filtered.length,
            released: filtered.filter((s) => s.status === "released").length,
            under_review: filtered.filter((s) => s.status === "under_review").length,
            submitted: filtered.filter((s) => s.status === "submitted").length,
            not_released: filtered.filter((s) => s.status === "not_released").length,
            with_risk_flags: filtered.filter((s) => s.risk_flags && s.risk_flags.length > 0).length,
            by_department: Object.entries(deptCounts)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 6),
            by_month: Object.entries(monthCounts)
              .map(([month, submissions]) => ({ month, submissions }))
              .slice(-6),
            by_sponsor: Object.entries(sponsorCounts)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5),
          });
        } else {
          // Use RPC data directly
          setDashboardStats(rpcData as DashboardStats);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setDashboardStats({
          total: 0,
          released: 0,
          under_review: 0,
          submitted: 0,
          not_released: 0,
          with_risk_flags: 0,
          by_department: [],
          by_month: [],
          by_sponsor: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange]);

  // Derive stats array for display
  const stats = dashboardStats ? [
    { label: "Total Submissions", value: dashboardStats.total.toLocaleString(), icon: FileText, color: "text-primary" },
    { label: "Released", value: dashboardStats.released.toLocaleString(), icon: CheckCircle, color: "text-success" },
    { label: "Under Review", value: dashboardStats.under_review.toLocaleString(), icon: Clock, color: "text-warning" },
    { label: "Risk Flags", value: dashboardStats.with_risk_flags.toLocaleString(), icon: AlertTriangle, color: "text-destructive" },
  ] : [];

  // Chart data
  const submissionsByMonth = dashboardStats?.by_month || [];
  const submissionsByDepartment = dashboardStats?.by_department || [];
  const submissionsBySponsor = dashboardStats?.by_sponsor || [];

  const handleExport = async () => {
    try {
      const { data } = await supabase
        .from("submissions")
        .select("submission_id, title, department, sponsor, status, risk_flags, created_at")
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) {
        alert("No data to export");
        return;
      }

      const headers = ["Submission ID", "Title", "Department", "Sponsor", "Status", "Risk Flags", "Created At"];
      const csvContent = [
        headers.join(","),
        ...data.map((s) =>
          [
            s.submission_id,
            `"${(s.title || "").replace(/"/g, '""')}"`,
            `"${(s.department || "").replace(/"/g, '""')}"`,
            `"${(s.sponsor || "N/A").replace(/"/g, '""')}"`,
            s.status,
            s.risk_flags?.length || 0,
            new Date(s.created_at).toLocaleDateString(),
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `submissions-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
    }
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
                        {submissionsByDepartment.map((_, index) => (
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
                <div className="flex items-center justify-center h-[100px] text-muted-foreground">
                  No data available for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
