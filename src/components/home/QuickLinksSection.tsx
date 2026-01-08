import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, History, BarChart3, BookOpen, ArrowRight } from "lucide-react";

const quickLinks = [
  {
    icon: FileText,
    title: "New Submission",
    description: "Start a new manuscript submission with self-certification",
    href: "/submit",
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    icon: History,
    title: "My Submissions",
    description: "View and track your submission history",
    href: "/submissions",
    color: "bg-emerald-500/10 text-emerald-600"
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    description: "Access institutional analytics and reports",
    href: "/dashboard",
    color: "bg-amber-500/10 text-amber-600"
  },
  {
    icon: BookOpen,
    title: "Guidelines",
    description: "Review public release policies and requirements",
    href: "#",
    color: "bg-purple-500/10 text-purple-600"
  },
];

const QuickLinksSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Quick Access
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need, just a click away
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickLinks.map((link) => (
            <Link key={link.title} to={link.href}>
              <Card className="h-full card-hover border-border hover:border-primary/30 group">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${link.color} flex items-center justify-center mb-4`}>
                    <link.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {link.title}
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{link.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickLinksSection;
