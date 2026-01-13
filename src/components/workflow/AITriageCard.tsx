import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AITriageAssessment {
  id: string;
  model_version: string;
  risk_score: number;
  confidence_score: number;
  risk_level: string;
  detected_concerns: string[];
  recommended_flags: string[];
  suggested_reviewer_role: string | null;
  assessment_data: Record<string, unknown>;
  created_at: string;
}

interface Props {
  submissionId: string;
}

const riskLevelConfig: Record<string, { label: string; className: string; icon: typeof AlertTriangle; progressColor: string }> = {
  low: {
    label: "Low Risk",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    progressColor: "bg-green-500",
  },
  medium: {
    label: "Medium Risk",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertTriangle,
    progressColor: "bg-yellow-500",
  },
  high: {
    label: "High Risk",
    className: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertTriangle,
    progressColor: "bg-orange-500",
  },
  critical: {
    label: "Critical Risk",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: ShieldAlert,
    progressColor: "bg-red-500",
  },
};

const roleLabels: Record<string, string> = {
  faculty: "Faculty",
  chair: "Department Chair",
  lab_director: "Lab Director",
  vice_provost: "Vice Provost",
  admin: "Administrator",
};

const AITriageCard = ({ submissionId }: Props) => {
  const [assessment, setAssessment] = useState<AITriageAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessment = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("ai_triage_assessments")
          .select("*")
          .eq("submission_id", submissionId)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        setAssessment(data);
      } catch (err) {
        console.error("Error fetching AI triage:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [submissionId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assessment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            AI triage assessment is not yet available for this submission.
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = riskLevelConfig[assessment.risk_level] || riskLevelConfig.medium;
  const RiskIcon = config.icon;

  return (
    <Card className={`border-2 ${config.className.includes("border") ? config.className.split(" ").find(c => c.startsWith("border-")) : ""}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Risk Assessment
          </span>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {assessment.model_version}
          </Badge>
        </CardTitle>
        <CardDescription>
          Automated risk analysis based on submission content and certifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Risk Level Badge */}
        <div className="flex items-center justify-center mb-6">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-medium ${config.className}`}>
            <RiskIcon className="h-5 w-5" />
            {config.label}
          </div>
        </div>

        {/* Risk Score */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Risk Score</span>
            <span className="font-medium">{Math.round(assessment.risk_score * 100)}%</span>
          </div>
          <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className={`absolute h-full rounded-full transition-all ${config.progressColor}`}
              style={{ width: `${assessment.risk_score * 100}%` }}
            />
          </div>
        </div>

        {/* Confidence Score */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Assessment Confidence</span>
            <span className="font-medium">{Math.round(assessment.confidence_score * 100)}%</span>
          </div>
          <Progress value={assessment.confidence_score * 100} className="h-2" />
        </div>

        {/* Detected Concerns */}
        {assessment.detected_concerns && assessment.detected_concerns.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Detected Concerns
            </h4>
            <ul className="space-y-2">
              {assessment.detected_concerns.map((concern, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm p-2 rounded-lg bg-warning/10"
                >
                  <Info className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Reviewer */}
        {assessment.suggested_reviewer_role && (
          <div className="p-3 rounded-lg bg-secondary">
            <p className="text-sm">
              <span className="text-muted-foreground">Recommended reviewer level: </span>
              <span className="font-medium">
                {roleLabels[assessment.suggested_reviewer_role] || assessment.suggested_reviewer_role}
              </span>
            </p>
          </div>
        )}

        {/* Assessment Time */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
          Assessment generated on {new Date(assessment.created_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default AITriageCard;
