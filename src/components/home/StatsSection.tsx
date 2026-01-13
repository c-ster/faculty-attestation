import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Stats {
  submissionsThisYear: number;
  releasedPercentage: number;
  departmentsServed: number;
  totalSubmissions: number;
}

const StatsSection = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get current year start
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;

        // Fetch all submissions
        const { data: allSubmissions, error: allError } = await supabase
          .from("submissions")
          .select("id, status, department, created_at");

        if (allError) throw allError;

        // Calculate stats
        const submissionsThisYear = allSubmissions?.filter(
          (s) => s.created_at >= yearStart
        ).length || 0;

        const totalSubmissions = allSubmissions?.length || 0;
        const releasedCount = allSubmissions?.filter(
          (s) => s.status === "released"
        ).length || 0;

        const releasedPercentage = totalSubmissions > 0
          ? Math.round((releasedCount / totalSubmissions) * 100)
          : 0;

        const uniqueDepartments = new Set(
          allSubmissions?.map((s) => s.department) || []
        );

        setStats({
          submissionsThisYear,
          releasedPercentage,
          departmentsServed: uniqueDepartments.size,
          totalSubmissions,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Set fallback values on error
        setStats({
          submissionsThisYear: 0,
          releasedPercentage: 0,
          departmentsServed: 0,
          totalSubmissions: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const displayStats = [
    {
      value: loading ? "—" : stats?.submissionsThisYear.toLocaleString() || "0",
      label: "Submissions This Year"
    },
    {
      value: loading ? "—" : `${stats?.releasedPercentage || 0}%`,
      label: "Released Publications"
    },
    {
      value: "< 48h",
      label: "Target Review Time"
    },
    {
      value: loading ? "—" : stats?.departmentsServed.toString() || "0",
      label: "Departments Served"
    },
  ];

  return (
    <section className="py-16 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {displayStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                {loading ? (
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
