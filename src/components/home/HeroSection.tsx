import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, CheckCircle } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-primary py-20 lg:py-28">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in">
            Public Release
            <span className="block text-accent">Self-Certification</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-primary-foreground/80 mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Streamline your scholarly publication process with NPS's secure, 
            faculty-first self-certification system for public release eligibility.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button asChild size="xl" variant="gold">
              <Link to="/submit" className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Start New Submission
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/submissions">
                View My Submissions
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Feature Pills */}
        <div className="mt-16 flex flex-wrap justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          {[
            "CAC / SSO Authentication",
            "Immutable Audit Trail",
            "Structured Questionnaire",
            "Real-Time Status Tracking"
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm"
            >
              <CheckCircle className="h-4 w-4 text-accent" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
