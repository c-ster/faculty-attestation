import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  User,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WorkflowStep {
  id: string;
  step_order: number;
  name: string;
  description: string | null;
  reviewer_role: string;
  required_approvals: number;
  timeout_days: number | null;
}

interface WorkflowInstance {
  id: string;
  workflow_id: string;
  current_step: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  final_decision: string | null;
  workflow: {
    name: string;
    description: string | null;
  };
}

interface Props {
  submissionId: string;
}

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pending", className: "bg-blue-100 text-blue-800", icon: Clock },
  in_progress: { label: "In Progress", className: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approved", className: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800", icon: XCircle },
  revision_requested: { label: "Revision Requested", className: "bg-orange-100 text-orange-800", icon: Clock },
};

const roleLabels: Record<string, string> = {
  faculty: "Faculty",
  chair: "Department Chair",
  lab_director: "Lab Director",
  vice_provost: "Vice Provost",
  admin: "Administrator",
};

const WorkflowStatusCard = ({ submissionId }: Props) => {
  const [workflowInstance, setWorkflowInstance] = useState<WorkflowInstance | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflowData = async () => {
      setLoading(true);
      try {
        // Fetch workflow instance
        const { data: instanceData, error: instanceError } = await supabase
          .from("submission_workflows")
          .select(`
            id,
            workflow_id,
            current_step,
            status,
            started_at,
            completed_at,
            final_decision
          `)
          .eq("submission_id", submissionId)
          .single();

        if (instanceError && instanceError.code !== "PGRST116") {
          throw instanceError;
        }

        if (instanceData) {
          // Fetch workflow details
          const { data: workflowData } = await supabase
            .from("approval_workflows")
            .select("name, description")
            .eq("id", instanceData.workflow_id)
            .single();

          setWorkflowInstance({
            ...instanceData,
            workflow: workflowData || { name: "Unknown Workflow", description: null },
          });

          // Fetch workflow steps
          const { data: stepsData } = await supabase
            .from("workflow_steps")
            .select("*")
            .eq("workflow_id", instanceData.workflow_id)
            .order("step_order", { ascending: true });

          setSteps(stepsData || []);
        }
      } catch (err) {
        console.error("Error fetching workflow data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowData();
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

  if (!workflowInstance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Approval Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No workflow assigned yet. The workflow will be automatically assigned when the submission is processed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = statusConfig[workflowInstance.status]?.icon || Clock;
  const progress = steps.length > 0
    ? ((workflowInstance.current_step - 1) / steps.length) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Approval Workflow
          </span>
          <Badge className={statusConfig[workflowInstance.status]?.className || "bg-gray-100"}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig[workflowInstance.status]?.label || workflowInstance.status}
          </Badge>
        </CardTitle>
        <CardDescription>
          {workflowInstance.workflow.name}
          {workflowInstance.workflow.description && ` - ${workflowInstance.workflow.description}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              Step {workflowInstance.current_step} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Timeline */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isCompleted = step.step_order < workflowInstance.current_step;
            const isCurrent = step.step_order === workflowInstance.current_step;
            const isPending = step.step_order > workflowInstance.current_step;

            return (
              <div key={step.id} className="flex items-start gap-4">
                {/* Step Indicator */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? "bg-green-100 text-green-700"
                        : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{step.step_order}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-0.5 h-8 mt-2 ${
                        isCompleted ? "bg-green-300" : "bg-border"
                      }`}
                    />
                  )}
                </div>

                {/* Step Details */}
                <div className={`flex-1 pb-4 ${isPending ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{step.name}</h4>
                    {isCurrent && (
                      <Badge variant="outline" className="text-xs">
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Current
                      </Badge>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {roleLabels[step.reviewer_role] || step.reviewer_role}
                    </span>
                    {step.timeout_days && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {step.timeout_days} days timeout
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Info */}
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Started: {new Date(workflowInstance.started_at).toLocaleDateString()}</span>
            {workflowInstance.completed_at && (
              <span>Completed: {new Date(workflowInstance.completed_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowStatusCard;
