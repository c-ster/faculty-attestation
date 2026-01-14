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
        // Use the SECURITY DEFINER function to get aggregate stats (bypasses RLS)
        console.log("Calling get_public_stats RPC...");
        const { data, error } = await supabase.rpc("get_public_stats");
        console.log("get_public_stats response:", { data, error });

        if (error) {
          console.error("Error calling get_public_stats:", error);
          // Fallback to direct query if function doesn't exist yet
          const { data: fallbackData } = await supabase
            .from("submissions")
            .select("id, status, department, created_at");

          const currentYear = new Date().getFullYear();
          const yearStart = `${currentYear}-01-01`;

          const submissionsThisYear = fallbackData?.filter(
            (s) => s.created_at >= yearStart
          ).length || 0;

          const totalSubmissions = fallbackData?.length || 0;
          const releasedCount = fallbackData?.filter(
            (s) => s.status === "released"
          ).length || 0;

          const releasedPercentage = totalSubmissions > 0
            ? Math.round((releasedCount / totalSubmissions) * 100)
            : 0;

          const uniqueDepartments = new Set(
            fallbackData?.map((s) => s.department) || []
          );

          setStats({
            submissionsThisYear,
            releasedPercentage,
            departmentsServed: uniqueDepartments.size,
            totalSubmissions,
          });
        } else {
          // Use the function result
          setStats({
            submissionsThisYear: data?.submissions_this_year || 0,
            releasedPercentage: data?.released_percentage || 0,
            departmentsServed: data?.departments_count || 0,
            totalSubmissions: data?.total_submissions || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
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
