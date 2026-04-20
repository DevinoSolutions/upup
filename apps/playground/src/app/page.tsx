'use client'
import { InteractiveExample } from "@upup/interactive-example";
import "@upup/interactive-example/styles";
import Toast from "@/components/Toast";

export default function Home() {
  return (
    <div className="container mx-auto" style={{ padding: 24, maxWidth: 1400 }}>
      <p className="text-sm text-gray-600 dark:text-gray-400" style={{ marginBottom: 16, maxWidth: 720 }}>
        Tweak props on the left, see the uploader update on the right.
        Switch to the <strong>Code</strong> tab for a copy-pasteable snippet, or
        share your config with <strong>Copy permalink</strong>.
      </p>
      <InteractiveExample
        defaultExpanded={['upload']}
      />
      <Toast />
    </div>
  );
}
