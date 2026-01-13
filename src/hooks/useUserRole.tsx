import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AppRole = "faculty" | "chair" | "lab_director" | "vice_provost" | "admin";

interface UseUserRoleReturn {
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isLeadership: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        // First try to get role from user_roles table
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "no rows returned" - that's okay
          console.error("Error fetching user role:", error);
        }

        setRole(data?.role as AppRole || "faculty");
      } catch (err) {
        console.error("Error fetching user role:", err);
        setRole("faculty"); // Default to faculty
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const isAdmin = role === "admin";
  const isLeadership = ["chair", "lab_director", "vice_provost", "admin"].includes(role || "");

  return { role, loading, isAdmin, isLeadership };
}
