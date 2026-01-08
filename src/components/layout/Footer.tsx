import { Shield } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Naval Postgraduate School</p>
              <p className="text-xs text-muted-foreground">Public Release Self-Certification System</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact Support</a>
          </div>
          
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NPS Research Office
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
