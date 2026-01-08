import { FileUp, ClipboardCheck, Clock, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: FileUp,
    title: "Upload Manuscript",
    description: "Submit your manuscript with title, authors, abstract, and funding information."
  },
  {
    icon: ClipboardCheck,
    title: "Complete Self-Certification",
    description: "Answer structured questions about classification, export control, and prior release."
  },
  {
    icon: Clock,
    title: "Receive Confirmation",
    description: "Get a unique submission ID and timestamped attestation record instantly."
  },
  {
    icon: CheckCircle,
    title: "Track Status",
    description: "Monitor your submission through the review process with full transparency."
  }
];

const ProcessSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A streamlined four-step process designed for faculty convenience while maintaining full compliance and auditability.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative group"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}
              
              <div className="relative bg-card rounded-xl p-6 border border-border card-hover text-center">
                {/* Step Number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
