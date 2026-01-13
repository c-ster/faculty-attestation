import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Building2,
  GraduationCap,
  Shield,
  FileText,
  CheckCircle,
  Clock,
  Edit2,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

interface SubmissionStats {
  total: number;
  released: number;
  underReview: number;
  pending: number;
}

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  faculty: { label: "Faculty", variant: "secondary" },
  chair: { label: "Department Chair", variant: "default" },
  lab_director: { label: "Lab Director", variant: "default" },
  vice_provost: { label: "Vice Provost", variant: "default" },
  admin: { label: "Administrator", variant: "default" },
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Form state
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [school, setSchool] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setDepartment(profile.department || "");
      setSchool(profile.school || "");
    }
  }, [profile]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      setLoadingStats(true);
      try {
        const { data, error } = await supabase
          .from("submissions")
          .select("status")
          .eq("user_id", user.id);

        if (error) throw error;

        const statsData: SubmissionStats = {
          total: data?.length || 0,
          released: data?.filter((s) => s.status === "released").length || 0,
          underReview: data?.filter((s) => s.status === "under_review").length || 0,
          pending: data?.filter((s) => s.status === "submitted").length || 0,
        };

        setStats(statsData);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          department: department.trim() || null,
          school: school.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

      setIsEditing(false);
      // Refresh the page to update the profile in context
      window.location.reload();
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Update Failed",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name);
      setDepartment(profile.department || "");
      setSchool(profile.school || "");
    }
    setIsEditing(false);
  };

  if (!user || !profile) {
    return (
      <Layout>
        <div className="page-container flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const roleConfig = roleLabels[role || "faculty"];

  return (
    <Layout>
      <div className="page-container max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your account information</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your account details and affiliation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school">School</Label>
                      <Input
                        id="school"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="e.g., GSEAS"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleCancel} disabled={saving}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <dl className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <dt className="text-sm text-muted-foreground">Full Name</dt>
                      <dd className="font-medium">{profile.full_name}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <dt className="text-sm text-muted-foreground">Email</dt>
                      <dd className="font-medium">{profile.email}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <dt className="text-sm text-muted-foreground">Department</dt>
                      <dd className="font-medium">{profile.department || "Not specified"}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <dt className="text-sm text-muted-foreground">School</dt>
                      <dd className="font-medium">{profile.school || "Not specified"}</dd>
                    </div>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          {/* Role Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {roleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {role === "faculty"
                        ? "You can submit manuscripts for public release review."
                        : "You have access to review and manage submissions."}
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submission Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                My Submissions
              </CardTitle>
              <CardDescription>
                Overview of your submission activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-secondary">
                    <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-100 dark:bg-green-900/20">
                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.released}</p>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Released
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                    <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{stats.underReview}</p>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      In Review
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.pending}</p>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <FileText className="h-3 w-3" />
                      Pending
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No submission data available
                </p>
              )}

              <Separator className="my-4" />

              <div className="flex justify-center">
                <Button variant="outline" onClick={() => navigate("/submissions")}>
                  <FileText className="h-4 w-4 mr-2" />
                  View All Submissions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
