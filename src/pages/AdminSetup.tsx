import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Shield, UserCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppRole = "faculty" | "chair" | "lab_director" | "vice_provost" | "admin";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  current_role: AppRole | null;
}

const AdminSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAndFetchUsers();
  }, []);

  const checkAndFetchUsers = async () => {
    try {
      // Check if any admin exists
      const { data: adminCheck } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);

      setHasAdmin(adminCheck && adminCheck.length > 0);

      // Fetch all profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name");

      if (profileError) throw profileError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          current_role: (userRole?.role as AppRole) || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users. You may not have permission.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: AppRole) => {
    setUpdating(userId);
    try {
      // Delete existing role for this user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `Successfully assigned ${role} role.`,
      });

      // Refresh the list
      await checkAndFetchUsers();
    } catch (error) {
      console.error("Error assigning role:", error);
      toast({
        title: "Error",
        description: "Failed to assign role. Check database permissions.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const makeCurrentUserAdmin = async () => {
    if (!user) return;

    setUpdating(user.id);
    try {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You are now an admin. Refresh the page to access the dashboard.",
      });

      setHasAdmin(true);
      await checkAndFetchUsers();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to assign admin role.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // First-time setup: No admin exists
  if (!hasAdmin) {
    return (
      <Layout>
        <div className="page-container max-w-xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>Initial Admin Setup</CardTitle>
              <CardDescription>
                No administrator has been configured yet. Click below to make yourself the first admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                size="lg"
                onClick={makeCurrentUserAdmin}
                disabled={updating !== null}
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                Make Me Admin
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Logged in as: {user?.email}
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Check if current user is admin
  const currentUserRole = users.find((u) => u.id === user?.id)?.current_role;
  const isCurrentUserAdmin = currentUserRole === "admin";

  if (!isCurrentUserAdmin) {
    return (
      <Layout>
        <div className="page-container max-w-xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                Only administrators can manage user roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Your current role: {currentUserRole || "No role assigned"}
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">User Role Management</h1>
          <p className="text-muted-foreground mt-1">
            Assign roles to users to control their access levels
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Select a role for each user. Roles determine access to different features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{u.full_name || "No name"}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.id === user?.id && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-1 inline-block">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={u.current_role || "none"}
                      onValueChange={(value) => {
                        if (value !== "none") {
                          assignRole(u.id, value as AppRole);
                        }
                      }}
                      disabled={updating === u.id}
                    >
                      <SelectTrigger className="w-40">
                        {updating === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue placeholder="Select role" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>No role</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="chair">Chair</SelectItem>
                        <SelectItem value="lab_director">Lab Director</SelectItem>
                        <SelectItem value="vice_provost">Vice Provost</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No users found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Role Descriptions</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>Faculty:</strong> Can submit attestations and view their own submissions</li>
            <li><strong>Chair:</strong> Can review department submissions + faculty access</li>
            <li><strong>Lab Director:</strong> Can review lab submissions + faculty access</li>
            <li><strong>Vice Provost:</strong> Can view all submissions + final approval authority</li>
            <li><strong>Admin:</strong> Full access to all features including user management</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSetup;
