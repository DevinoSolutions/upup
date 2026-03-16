import HomepageDemo from "@/components/HomepageDemo";
import Toast from "@/components/Toast";

export const metadata = {
  title: "Upup Playground",
  description: "Developer playground for testing the Upup uploader component.",
};

export default function Home() {
  return (
    <div className="container mx-auto">
      <HomepageDemo />
      <Toast />
    </div>
  );
}
