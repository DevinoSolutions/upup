'use client'
import { InteractiveExample } from "@upup/interactive-example";
import "@upup/interactive-example/styles";
import Toast from "@/components/Toast";

export default function Home() {
  return (
    <div className="container mx-auto" style={{ padding: 24, maxWidth: 1400 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        upup Playground
      </h1>
      <InteractiveExample
        defaultExpanded={['upload', 'appearance']}
      />
      <Toast />
    </div>
  );
}
