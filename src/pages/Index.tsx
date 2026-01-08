import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import ProcessSection from "@/components/home/ProcessSection";
import StatsSection from "@/components/home/StatsSection";
import QuickLinksSection from "@/components/home/QuickLinksSection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <StatsSection />
      <ProcessSection />
      <QuickLinksSection />
    </Layout>
  );
};

export default Index;
