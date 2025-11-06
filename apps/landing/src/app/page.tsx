import HomepageDemo from "@/components/HomepageDemo";
import HomepageFeatures from "@/components/HomepageFeatures";
import FeedbackSection from "@/components/FeedbackSection";
import Toast from "@/components/Toast";
import { siteConfig } from "@/lib/siteConfig";
import HeroSection from "@/components/HomepageHero";
import StackBlitzDemoSection from "@/components/StackBlitzDemoSection";

export const metadata = {
    title: "Upup by Devino",
    description: siteConfig.tagline,
};

export default function Home() {
    return (
        <div className="container mx-auto">
            <HeroSection />
            <HomepageDemo />
            <HomepageFeatures />
            <StackBlitzDemoSection />
            <FeedbackSection />
            <Toast />
        </div>
    );
}