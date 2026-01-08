import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, FileText, CheckCircle, Clock, AlertTriangle, Download, TrendingUp, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { useState } from "react";

const submissionsByMonth = [
  { month: "Aug", submissions: 45 },
  { month: "Sep", submissions: 62 },
  { month: "Oct", submissions: 78 },
  { month: "Nov", submissions: 91 },
  { month: "Dec", submissions: 84 },
  { month: "Jan", submissions: 102 },
];

const submissionsByDepartment = [
  { name: "Computer Science", value: 156 },
  { name: "Electrical Eng.", value: 124 },
  { name: "Operations Research", value: 98 },
  { name: "Defense Analysis", value: 87 },
  { name: "Mechanical Eng.", value: 76 },
  { name: "Other", value: 112 },
];

const submissionsBySponsor = [
  { name: "ONR", value: 234 },
  { name: "DARPA", value: 156 },
  { name: "NSF", value: 98 },
  { name: "AFRL", value: 87 },
  { name: "Other DoD", value: 78 },
];

const riskTrends = [
  { month: "Aug", noRisk: 38, lowRisk: 5, highRisk: 2 },
  { month: "Sep", noRisk: 52, lowRisk: 7, highRisk: 3 },
  { month: "Oct", noRisk: 65, lowRisk: 9, highRisk: 4 },
  { month: "Nov", noRisk: 75, lowRisk: 12, highRisk: 4 },
  { month: "Dec", noRisk: 68, lowRisk: 11, highRisk: 5 },
  { month: "Jan", noRisk: 85, lowRisk: 13, highRisk: 4 },
];

const COLORS = ['hsl(215, 80%, 15%)', 'hsl(43, 70%, 45%)', 'hsl(152, 60%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(215, 70%, 35%)', 'hsl(210, 20%, 70%)'];

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState("6m");

  const stats = [
    { label: "Total Submissions", value: "1,247", icon: FileText, change: "+12%", color: "text-primary" },
    { label: "Released", value: "1,172", icon: CheckCircle, change: "+8%", color: "text-success" },
    { label: "Under Review", value: "52", icon: Clock, change: "-5%", color: "text-warning" },
    { label: "Risk Flags", value: "23", icon: AlertTriangle, change: "+2%", color: "text-destructive" },
  ];

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
            <Button variant="outline">
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
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3 w-3 text-success" />
                      <span className="text-xs text-success">{stat.change}</span>
                      <span className="text-xs text-muted-foreground">vs prev period</span>
                    </div>
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
                {submissionsBySponsor.map((sponsor, index) => {
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
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Controls Notice */}
        <Card className="mt-6 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Workflow Controls (Phase 2)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Automated routing, approval workflows, and AI-assisted triage capabilities are planned for future phases. 
                  Currently, all status updates are managed manually by designated administrators.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
