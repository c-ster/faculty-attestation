import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Send, Loader2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { validateFile, MAX_FILE_SIZE } from "@/lib/validations";

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

// Map departments to their respective schools
const departmentToSchool: Record<string, string> = {
  "Computer Science": "Graduate School of Engineering and Applied Sciences",
  "Electrical Engineering": "Graduate School of Engineering and Applied Sciences",
  "Mechanical Engineering": "Graduate School of Engineering and Applied Sciences",
  "Physics": "Graduate School of Engineering and Applied Sciences",
  "Meteorology": "Graduate School of Engineering and Applied Sciences",
  "Oceanography": "Graduate School of Engineering and Applied Sciences",
  "Systems Engineering": "Graduate School of Engineering and Applied Sciences",
  "Operations Research": "Graduate School of Operational and Information Sciences",
  "Defense Analysis": "Graduate School of Operational and Information Sciences",
  "National Security Affairs": "School of International Graduate Studies",
};

// COEUS Sponsors organized by category
const coeusSponsorCategories = [
  {
    category: "Core DoD Organizations",
    sponsors: [
      "Office of the Secretary of Defense (OSD R&E)",
      "Defense Advanced Research Projects Agency (DARPA)",
      "Office of Naval Research (ONR)",
      "Naval Sea Systems Command (NAVSEA)",
      "Naval Information Warfare Systems Command (NAVWAR)",
      "Air Force Research Laboratory (AFRL)",
      "Army Futures Command",
    ],
  },
  {
    category: "Joint / Defense-Wide",
    sponsors: [
      "Defense Innovation Unit (DIU)",
      "Chief Digital and Artificial Intelligence Office (CDAO)",
      "Strategic Capabilities Office (SCO)",
    ],
  },
  {
    category: "National Security & Intelligence Community",
    sponsors: [
      "Office of the Director of National Intelligence (ODNI)",
      "National Reconnaissance Office (NRO)",
      "National Geospatial-Intelligence Agency (NGA)",
      "Intelligence Advanced Research Projects Activity (IARPA)",
    ],
  },
  {
    category: "Defense Primes & Major Integrators",
    sponsors: [
      "Lockheed Martin",
      "Northrop Grumman",
      "Raytheon",
      "Boeing Defense",
      "General Dynamics",
      "L3Harris",
      "BAE Systems",
    ],
  },
  {
    category: "AI, Compute & Software",
    sponsors: [
      "NVIDIA",
      "Microsoft (Azure Gov)",
      "Amazon Web Services (AWS GovCloud)",
      "Palantir",
      "Anduril",
    ],
  },
  {
    category: "Semiconductors & Electronics",
    sponsors: [
      "Analog Devices",
      "Texas Instruments",
      "Intel",
      "Qualcomm",
      "Teledyne",
    ],
  },
  {
    category: "Energy & Industrial",
    sponsors: [
      "General Electric",
      "Siemens",
      "Schneider Electric",
      "Exelon",
      "Fluor",
    ],
  },
  {
    category: "Foundations",
    sponsors: [
      "Simons Foundation",
      "Schmidt Futures",
      "Carnegie Corporation",
      "Rockefeller Foundation",
      "Patrick J. McGovern Foundation",
    ],
  },
  {
    category: "International Partners",
    sponsors: [
      "UK Ministry of Defence",
      "Defence Science and Technology Group (Australia)",
      "NATO Allied Command Transformation",
      "Canadian Department of National Defence",
    ],
  },
];

const certificationQuestions = [
  {
    id: "classification",
    section: "Classification",
    question: "Does this manuscript contain any classified information?",
    helpText: "This includes information marked or unmarked that requires protection in the interest of national security.",
    riskIndicator: true,
    dbField: "contains_classified",
  },
  {
    id: "operational",
    section: "Operational Sensitivity",
    question: "Does this manuscript contain operationally sensitive information?",
    helpText: "Information that could reveal tactics, techniques, or procedures (TTPs) or operational capabilities.",
    riskIndicator: true,
    dbField: "contains_operational_info",
  },
  {
    id: "export_control",
    section: "Export Control",
    question: "Does this manuscript contain ITAR or EAR controlled technical data?",
    helpText: "Technical data subject to International Traffic in Arms Regulations or Export Administration Regulations.",
    riskIndicator: true,
    dbField: "contains_export_controlled",
  },
  {
    id: "foreign_involvement",
    section: "Foreign Involvement",
    question: "Does this manuscript involve foreign nationals or international collaboration?",
    helpText: "Research conducted with or sponsored by foreign governments, institutions, or nationals.",
    riskIndicator: false,
    dbField: "has_foreign_involvement",
  },
  {
    id: "sponsor_restrictions",
    section: "Sponsor Requirements",
    question: "Does the funding sponsor require pre-publication review?",
    helpText: "Some sponsors mandate review before public release. Check your grant or contract terms.",
    riskIndicator: false,
    dbField: "has_sponsor_restrictions",
  },
  {
    id: "prior_release",
    section: "Prior Release",
    question: "Has any portion of this manuscript been previously approved for public release?",
    helpText: "Include prior conference presentations, working papers, or other approved publications.",
    riskIndicator: false,
    dbField: "has_prior_release",
  },
  {
    id: "coauthor_concurrence",
    section: "Co-Author Concurrence",
    question: "Have you received concurrence for release from all co-authors, both internal and external partners?",
    helpText: "This includes CRADA partners, MOA/MOU collaborators, and other academic collaborators.",
    riskIndicator: true,
    riskOnNo: true, // Special flag: risk when answer is "no" instead of "yes"
    dbField: "has_coauthor_concurrence",
  },
];

const Submit = () => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    authors: "",
    department: "",
    abstract: "",
    sponsor: "",
    coeusProposalNumber: "",
    venue: "",
    file: null as File | null,
    certification: {} as Record<string, string>,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleCertificationChange = (questionId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      certification: { ...prev.certification, [questionId]: value },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (file) {
      const validation = validateFile(file);

      if (!validation.valid) {
        setFileError(validation.error || "Invalid file");
        // Reset the input
        e.target.value = "";
        return;
      }

      setFormData((prev) => ({ ...prev, file }));
    }
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, file: null }));
    setFileError(null);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);

    try {
      // Calculate risk flags - handle both "yes" risk indicators and special "no" risk indicators
      const riskFlags = Object.entries(formData.certification)
        .filter(([key, value]) => {
          const question = certificationQuestions.find((q) => q.id === key);
          if (!question?.riskIndicator) return false;
          // For riskOnNo questions, flag when answer is "no"
          if (question.riskOnNo) return value === "no";
          // For standard questions, flag when answer is "yes"
          return value === "yes";
        })
        .map(([key]) => key);

      // Parse authors into array
      const authorsArray = formData.authors.split(";").map((a) => a.trim()).filter(Boolean);

      // Derive school from department
      const derivedSchool = departmentToSchool[formData.department] || "Naval Postgraduate School";

      // Upload manuscript if provided
      let manuscriptPath = null;
      let manuscriptFilename = null;

      if (formData.file) {
        const fileExt = formData.file.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("manuscripts")
          .upload(filePath, formData.file);

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        manuscriptPath = filePath;
        manuscriptFilename = formData.file.name;
      }

      // Create submission with proper typing
      const submissionData: TablesInsert<"submissions"> = {
        user_id: user.id,
        title: formData.title,
        authors: authorsArray,
        department: formData.department,
        school: derivedSchool,
        abstract: formData.abstract,
        sponsor: formData.sponsor || null,
        funding_source: formData.coeusProposalNumber || null,
        target_venue: formData.venue || null,
        manuscript_path: manuscriptPath,
        manuscript_filename: manuscriptFilename,
        risk_flags: riskFlags,
      };

      const { data: submission, error: submissionError } = await supabase
        .from("submissions")
        .insert(submissionData)
        .select()
        .single();

      if (submissionError) {
        throw new Error(`Submission failed: ${submissionError.message}`);
      }

      // Create self-certification record
      const { error: certError } = await supabase.from("self_certifications").insert({
        submission_id: submission.id,
        contains_classified: formData.certification.classification === "yes",
        contains_operational_info: formData.certification.operational === "yes",
        contains_export_controlled: formData.certification.export_control === "yes",
        has_foreign_involvement: formData.certification.foreign_involvement === "yes",
        has_sponsor_restrictions: formData.certification.sponsor_restrictions === "yes",
        has_prior_release: formData.certification.prior_release === "yes",
        has_coauthor_concurrence: formData.certification.coauthor_concurrence === "yes",
        attested_accurate: true,
        attested_at: new Date().toISOString(),
      });

      if (certError) {
        throw new Error(`Certification failed: ${certError.message}`);
      }

      // Create attestation log
      await supabase.from("attestation_logs").insert({
        submission_id: submission.id,
        user_id: user.id,
        action: "submitted",
        new_value: JSON.stringify({
          title: formData.title,
          certification: formData.certification,
        }),
      });

      toast({
        title: "Submission Successful!",
        description: `Your submission ID is ${submission.submission_id}. You will receive a confirmation email.`,
      });

      navigate("/submissions");
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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

  // Count risk indicators - handle both "yes" and special "no" risk cases
  const riskCount = Object.entries(formData.certification).filter(([key, value]) => {
    const question = certificationQuestions.find((q) => q.id === key);
    if (!question?.riskIndicator) return false;
    if (question.riskOnNo) return value === "no";
    return value === "yes";
  }).length;

  return (
    <Layout>
      <div className="page-container max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Step {step} of {totalSteps}
            </span>
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
              <CardDescription>Provide information about your manuscript and submission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Manuscript Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter the full title of your manuscript"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authors">Authors *</Label>
                <Input
                  id="authors"
                  placeholder="List all authors (e.g., Smith, J.; Jones, A.)"
                  value={formData.authors}
                  onChange={(e) => setFormData((prev) => ({ ...prev, authors: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sponsor">Sponsor</Label>
                  <Select
                    value={formData.sponsor}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, sponsor: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sponsor" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {coeusSponsorCategories.map((category) => (
                        <SelectGroup key={category.category}>
                          <SelectLabel className="font-semibold text-xs uppercase tracking-wide text-muted-foreground px-2 py-1.5">
                            {category.category}
                          </SelectLabel>
                          {category.sponsors.map((sponsor) => (
                            <SelectItem key={sponsor} value={sponsor}>
                              {sponsor}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coeusProposalNumber">Coeus Proposal #</Label>
                  <Input
                    id="coeusProposalNumber"
                    placeholder="Enter Coeus proposal number"
                    value={formData.coeusProposalNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, coeusProposalNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Target Venue</Label>
                <Input
                  id="venue"
                  placeholder="Conference name or journal"
                  value={formData.venue}
                  onChange={(e) => setFormData((prev) => ({ ...prev, venue: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abstract">Abstract / Summary *</Label>
                <Textarea
                  id="abstract"
                  placeholder="Provide a brief summary of your manuscript"
                  rows={4}
                  value={formData.abstract}
                  onChange={(e) => setFormData((prev) => ({ ...prev, abstract: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Manuscript Upload</Label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  fileError ? "border-destructive bg-destructive/5" : "border-border hover:border-primary/50"
                }`}>
                  <input
                    type="file"
                    id="file"
                    accept=".pdf,.docx,.doc"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {formData.file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="text-sm text-foreground font-medium">{formData.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="file" className="cursor-pointer">
                      <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF or DOCX (max 50MB)</p>
                    </label>
                  )}
                </div>
                {fileError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {fileError}
                  </p>
                )}
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
              {certificationQuestions.map((q) => {
                const isRiskTriggered = q.riskIndicator && (
                  q.riskOnNo
                    ? formData.certification[q.id] === "no"
                    : formData.certification[q.id] === "yes"
                );
                return (
                <div key={q.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {isRiskTriggered && (
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
                          <Label htmlFor={`${q.id}-yes`} className="font-normal cursor-pointer">
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id={`${q.id}-no`} />
                          <Label htmlFor={`${q.id}-no`} className="font-normal cursor-pointer">
                            No
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              );
              })}

              {riskCount > 0 && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {riskCount} Risk Indicator{riskCount > 1 ? "s" : ""} Identified
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your submission may require additional review. This is informational only and does not prevent
                      submission.
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
              <CardDescription>Review your submission before final attestation</CardDescription>
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
                    <dt className="text-muted-foreground">Coeus Proposal #</dt>
                    <dd className="font-medium">{formData.coeusProposalNumber || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Target Venue</dt>
                    <dd className="font-medium">{formData.venue || "Not specified"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">File</dt>
                    <dd className="font-medium">{formData.file?.name || "No file uploaded"}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-secondary rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-foreground">Certification Responses</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {certificationQuestions.map((q) => {
                    const isRiskTriggered = q.riskIndicator && (
                      q.riskOnNo
                        ? formData.certification[q.id] === "no"
                        : formData.certification[q.id] === "yes"
                    );
                    return (
                      <div key={q.id} className="flex items-center justify-between p-2 bg-card rounded">
                        <span className="text-muted-foreground">{q.section}</span>
                        <span className={`font-medium ${isRiskTriggered ? "text-warning" : ""}`}>
                          {formData.certification[q.id]?.toUpperCase() || "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <strong>Attestation Statement:</strong> By submitting, I attest that the information provided is
                  accurate to the best of my knowledge. I understand this self-certification documents my responses but
                  does not constitute formal public release approval.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1 || submitting}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {step < totalSteps ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button variant="gold" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Attestation
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Submit;
