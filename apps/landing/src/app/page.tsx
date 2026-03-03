import HomepageDemo from "@/components/HomepageDemo";
import HomepageFeatures from "@/components/HomepageFeatures";
import FeedbackSection from "@/components/FeedbackSection";
import Toast from "@/components/Toast";
import HeroSection from "@/components/HomepageHero";
import StackBlitzDemoSection from "@/components/StackBlitzDemoSection";

export const metadata = {
    title: "Upup – React Drag & Drop File Upload | npm Package",
    description:
        "Free React & TypeScript file upload npm package: dropzone, file picker, progress bar & retry. Upload images, videos & large files to S3, Azure or Google Drive.",
    alternates: {
        canonical: "https://useupup.com/",
    },
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