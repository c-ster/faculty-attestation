import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UseUserRoleResult {
  role: AppRole | null;
  roles: AppRole[];
  loading: boolean;
  isLeadership: boolean;
  isAdmin: boolean;
  hasRole: (role: AppRole) => boolean;
}

export const useUserRole = (): UseUserRoleResult => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
      } else {
        setRoles(data.map((r) => r.role));
      }
      setLoading(false);
    };

    fetchRoles();
  }, [user]);

  // Get primary role based on hierarchy
  const getPrimaryRole = (): AppRole | null => {
    if (roles.includes("admin")) return "admin";
    if (roles.includes("vice_provost")) return "vice_provost";
    if (roles.includes("lab_director")) return "lab_director";
    if (roles.includes("chair")) return "chair";
    if (roles.includes("faculty")) return "faculty";
    return null;
  };

  const hasRole = (role: AppRole): boolean => roles.includes(role);

  const isLeadership =
    hasRole("chair") ||
    hasRole("lab_director") ||
    hasRole("vice_provost") ||
    hasRole("admin");

  const isAdmin = hasRole("admin");

  return {
    role: getPrimaryRole(),
    roles,
    loading,
    isLeadership,
    isAdmin,
    hasRole,
  };
};
