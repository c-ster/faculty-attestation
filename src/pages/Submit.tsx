import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const departments = [
  "Computer Science",
  "Electrical Engineering", 
  "Mechanical Engineering",
  "Operations Research",
  "Defense Analysis",
  "National Security Affairs",
  "Physics",
  "Meteorology",
  "Oceanography",
  "Systems Engineering",
];

const certificationQuestions = [
  {
    id: "classification",
    section: "Classification",
    question: "Does this manuscript contain any classified information?",
    helpText: "This includes information marked or unmarked that requires protection in the interest of national security.",
    riskIndicator: true,
  },
  {
    id: "operational",
    section: "Operational Sensitivity",
    question: "Does this manuscript contain operationally sensitive information?",
    helpText: "Information that could reveal tactics, techniques, or procedures (TTPs) or operational capabilities.",
    riskIndicator: true,
  },
  {
    id: "export_control",
    section: "Export Control",
    question: "Does this manuscript contain ITAR or EAR controlled technical data?",
    helpText: "Technical data subject to International Traffic in Arms Regulations or Export Administration Regulations.",
    riskIndicator: true,
  },
  {
    id: "foreign_involvement",
    section: "Foreign Involvement",
    question: "Does this manuscript involve foreign nationals or international collaboration?",
    helpText: "Research conducted with or sponsored by foreign governments, institutions, or nationals.",
    riskIndicator: false,
  },
  {
    id: "sponsor_restrictions",
    section: "Sponsor Requirements",
    question: "Does the funding sponsor require pre-publication review?",
    helpText: "Some sponsors mandate review before public release. Check your grant or contract terms.",
    riskIndicator: false,
  },
  {
    id: "prior_release",
    section: "Prior Release",
    question: "Has any portion of this manuscript been previously approved for public release?",
    helpText: "Include prior conference presentations, working papers, or other approved publications.",
    riskIndicator: false,
  },
];

const Submit = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    authors: "",
    department: "",
    abstract: "",
    sponsor: "",
    venue: "",
    file: null as File | null,
    certification: {} as Record<string, string>,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleCertificationChange = (questionId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      certification: { ...prev.certification, [questionId]: value }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleSubmit = () => {
    const submissionId = `NPS-${Date.now().toString(36).toUpperCase()}`;
    toast({
      title: "Submission Successful!",
      description: `Your submission ID is ${submissionId}. You will receive a confirmation email.`,
    });
    navigate("/submissions");
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.title && formData.authors && formData.department && formData.abstract;
    }
    if (step === 2) {
      return Object.keys(formData.certification).length === certificationQuestions.length;
    }
    return true;
  };

  const riskCount = Object.entries(formData.certification).filter(
    ([key, value]) => value === "yes" && certificationQuestions.find(q => q.id === key)?.riskIndicator
  ).length;

  return (
    <Layout>
      <div className="page-container max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Step {step} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">
              {step === 1 && "Manuscript Details"}
              {step === 2 && "Self-Certification"}
              {step === 3 && "Review & Submit"}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Manuscript Details */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Manuscript Details
              </CardTitle>
              <CardDescription>
                Provide information about your manuscript and submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Manuscript Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter the full title of your manuscript"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authors">Authors *</Label>
                <Input
                  id="authors"
                  placeholder="List all authors (e.g., Smith, J.; Jones, A.)"
                  value={formData.authors}
                  onChange={(e) => setFormData(prev => ({ ...prev, authors: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department / School *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sponsor">Sponsor / Funding Source</Label>
                  <Input
                    id="sponsor"
                    placeholder="e.g., ONR, DARPA, NSF"
                    value={formData.sponsor}
                    onChange={(e) => setFormData(prev => ({ ...prev, sponsor: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Target Venue</Label>
                <Input
                  id="venue"
                  placeholder="Conference name or journal"
                  value={formData.venue}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abstract">Abstract / Summary *</Label>
                <Textarea
                  id="abstract"
                  placeholder="Provide a brief summary of your manuscript"
                  rows={4}
                  value={formData.abstract}
                  onChange={(e) => setFormData(prev => ({ ...prev, abstract: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Manuscript Upload</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="file"
                    accept=".pdf,.docx,.doc"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    {formData.file ? (
                      <p className="text-sm text-foreground font-medium">{formData.file.name}</p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF or DOCX (max 50MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Self-Certification */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Self-Certification Questionnaire
              </CardTitle>
              <CardDescription>
                Answer all questions honestly. This does not determine releasability—it documents your attestation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {certificationQuestions.map((q) => (
                <div key={q.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {q.riskIndicator && formData.certification[q.id] === "yes" && (
                      <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <Label className="text-base font-medium">{q.section}</Label>
                      <p className="text-sm text-foreground mt-1 mb-3">{q.question}</p>
                      <p className="text-xs text-muted-foreground mb-4">{q.helpText}</p>
                      
                      <RadioGroup
                        value={formData.certification[q.id] || ""}
                        onValueChange={(value) => handleCertificationChange(q.id, value)}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id={`${q.id}-yes`} />
                          <Label htmlFor={`${q.id}-yes`} className="font-normal cursor-pointer">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id={`${q.id}-no`} />
                          <Label htmlFor={`${q.id}-no`} className="font-normal cursor-pointer">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              ))}

              {riskCount > 0 && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {riskCount} Risk Indicator{riskCount > 1 ? 's' : ''} Identified
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your submission may require additional review. This is informational only and does not prevent submission.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Review & Submit
              </CardTitle>
              <CardDescription>
                Review your submission before final attestation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-secondary rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-foreground">Manuscript Details</h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Title</dt>
                    <dd className="font-medium">{formData.title}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Authors</dt>
                    <dd className="font-medium">{formData.authors}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Department</dt>
                    <dd className="font-medium">{formData.department}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Sponsor</dt>
                    <dd className="font-medium">{formData.sponsor || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Target Venue</dt>
                    <dd className="font-medium">{formData.venue || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">File</dt>
                    <dd className="font-medium">{formData.file?.name || "No file uploaded"}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-secondary rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-foreground">Certification Responses</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {certificationQuestions.map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-2 bg-card rounded">
                      <span className="text-muted-foreground">{q.section}</span>
                      <span className={`font-medium ${formData.certification[q.id] === "yes" && q.riskIndicator ? "text-warning" : ""}`}>
                        {formData.certification[q.id]?.toUpperCase() || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <strong>Attestation Statement:</strong> By submitting, I attest that the information provided is accurate 
                  to the best of my knowledge. I understand this self-certification documents my responses but does not 
                  constitute formal public release approval.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button variant="gold" onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-2" />
              Submit Attestation
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Submit;
