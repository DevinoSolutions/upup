"use client";

import { useContext, useMemo, useState } from "react";
import { FileSource } from "@upup/core";
import { UpupUploader } from "@upup/react";
import "@upup/react/styles";
import {
  Check,
  Code2,
  Copy,
  MonitorUp,
  Moon,
  Package,
  Sun,
} from "lucide-react";
import { toast } from "react-toastify";
import { ThemeContext } from "@/lib/contexts";

type FrameworkId = "react" | "vue" | "vanilla";
type PreviewMode = "standard" | "mini";

const frameworks: Record<
  FrameworkId,
  {
    label: string;
    badge: string;
    install: string;
    capabilities: string[];
    snippet: string;
  }
> = {
  react: {
    label: "React",
    badge: "Live",
    install: "pnpm add @upup/react @upup/core",
    capabilities: [
      "Live preview below renders @upup/react",
      "Local file and URL sources",
      "Deterministic Next.js demo upload route",
    ],
    snippet: `import { FileSource } from "@upup/core";
import { UpupUploader } from "@upup/react";
import "@upup/react/styles";

export function UploadDemo() {
  return (
    <UpupUploader
      uploadEndpoint="/api/upup-demo/presign"
      sources={[FileSource.LOCAL, FileSource.URL]}
      maxFiles={3}
      enablePaste
    />
  );
}`,
  },
  vue: {
    label: "Vue",
    badge: "Code",
    install: "pnpm add @upup/vue @upup/core",
    capabilities: [
      "Vue QA lives in package Storybook",
      "Same local and URL source model",
      "Landing preview remains React-only",
    ],
    snippet: `<script setup lang="ts">
import { FileSource } from "@upup/core";
import { UpupUploader } from "@upup/vue";
import "@upup/vue/styles";
</script>

<template>
  <UpupUploader
    upload-endpoint="/api/upup-demo/presign"
    :sources="[FileSource.LOCAL, FileSource.URL]"
    :max-files="3"
    enable-paste
  />
</template>`,
  },
  vanilla: {
    label: "Core",
    badge: "Headless",
    install: "pnpm add @upup/core",
    capabilities: [
      "Use core upload orchestration directly",
      "Bring your own UI renderer",
      "Not shown as a landing live renderer",
    ],
    snippet: `import { UpupCore } from "@upup/core";

const uploader = new UpupCore({
  uploadEndpoint: "/api/upup-demo/presign",
  maxFiles: 3,
});

await uploader.addFiles(fileInput.files);
await uploader.upload();`,
  },
};

const themeClasses = {
  light: {
    panel: "border-gray-200 bg-white/80 text-gray-950",
    muted: "text-gray-600",
    button: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
    active: "border-sky-500 bg-sky-50 text-sky-800",
    code: "border-gray-200 bg-gray-950 text-gray-50",
  },
  dark: {
    panel: "border-gray-800 bg-gray-950/80 text-gray-50",
    muted: "text-gray-400",
    button: "border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800",
    active: "border-cyan-400 bg-cyan-950/70 text-cyan-100",
    code: "border-gray-800 bg-black text-gray-100",
  },
};

export default function LandingDemo() {
  const { isDarkMode } = useContext(ThemeContext);
  const [framework, setFramework] = useState<FrameworkId>("react");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("standard");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">(
    isDarkMode ? "dark" : "light",
  );
  const [copied, setCopied] = useState<"install" | "code" | null>(null);

  const selected = frameworks[framework];
  const palette = themeClasses[previewTheme];
  const uploaderTheme = useMemo(
    () => ({
      mode: previewTheme,
      slots: {
        uploader: {
          container:
            previewTheme === "dark"
              ? "ring-1 ring-cyan-400/20"
              : "ring-1 ring-sky-200",
        },
        fileList: {
          uploadButton:
            previewTheme === "dark"
              ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              : "bg-sky-600 hover:bg-sky-700 text-white",
          doneButton:
            previewTheme === "dark"
              ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              : "bg-sky-600 hover:bg-sky-700 text-white",
        },
        urlUploader: {
          fetchButton:
            previewTheme === "dark"
              ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              : "bg-sky-600 hover:bg-sky-700 text-white",
        },
      },
    }),
    [previewTheme],
  );

  async function copy(value: string, type: "install" | "code") {
    await navigator.clipboard?.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return (
    <section id="demo" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl min-w-0">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100">
              <MonitorUp className="h-4 w-4" />
              Live React package demo
            </div>
            <h2 className="text-3xl font-bold tracking-normal text-gray-950 dark:text-gray-50 sm:text-4xl">
              Upload UI, API route, and framework starter in one place
            </h2>
            <p className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-400">
              The preview uses the real React package. The framework selector
              changes the install command, snippet, and capability notes only.
            </p>
          </div>
          <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-950">
            {(["standard", "mini"] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setPreviewMode(mode)}
                className={`min-w-20 rounded-md px-3 py-2 text-center text-sm font-medium transition ${
                  previewMode === mode
                    ? "bg-gray-950 text-white dark:bg-gray-50 dark:text-gray-950"
                    : "text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50"
                }`}
              >
                {mode === "standard" ? "Standard" : "Mini"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className={`min-w-0 rounded-lg border p-4 ${palette.panel}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Framework target</h3>
                <p className={`text-sm ${palette.muted}`}>
                  Code output changes; the preview renderer does not.
                </p>
              </div>
              <Package className="h-5 w-5 text-sky-600 dark:text-cyan-300" />
            </div>

            <div className="mb-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
              {(Object.keys(frameworks) as FrameworkId[]).map(id => {
                const item = frameworks[id];
                const active = framework === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`landing-framework-${id}`}
                    onClick={() => setFramework(id)}
                    className={`min-w-0 rounded-lg border px-3 py-2 text-left transition ${
                      active ? palette.active : palette.button
                    }`}
                  >
                    <span className="block truncate text-sm font-semibold">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs opacity-80">
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mb-4 rounded-lg border border-current/10 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Install</span>
                <button
                  type="button"
                  aria-label="Copy install command"
                  onClick={() => copy(selected.install, "install")}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${palette.button}`}
                >
                  {copied === "install" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <code
                data-testid="landing-install-command"
                className="block max-w-full overflow-x-auto whitespace-nowrap text-sm"
              >
                {selected.install}
              </code>
            </div>

            <div className="mb-4 grid gap-2">
              {selected.capabilities.map(capability => (
                <div
                  key={capability}
                  data-testid="landing-capability"
                  className="flex items-start gap-2 text-sm"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-cyan-300" />
                  <span>{capability}</span>
                </div>
              ))}
            </div>

            <div className={`rounded-lg border p-3 ${palette.code}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Code2 className="h-4 w-4" />
                  Starter
                </span>
                <button
                  type="button"
                  aria-label="Copy code snippet"
                  onClick={() => copy(selected.snippet, "code")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/10 text-white hover:bg-white/15"
                >
                  {copied === "code" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <pre
                data-testid="landing-code-snippet"
                className="max-h-[360px] max-w-full overflow-auto whitespace-pre-wrap break-words text-xs leading-5"
              >
                <code>{selected.snippet}</code>
              </pre>
            </div>
          </div>

          <div className={`min-w-0 rounded-lg border p-4 ${palette.panel}`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Live preview</h3>
                <p className={`text-sm ${palette.muted}`}>
                  Renderer: @upup/react
                </p>
              </div>
              <div className="inline-flex w-fit rounded-lg border border-current/10 p-1">
                <button
                  type="button"
                  aria-label="Use light preview theme"
                  onClick={() => setPreviewTheme("light")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${
                    previewTheme === "light"
                      ? "bg-sky-600 text-white"
                      : "text-current hover:bg-current/10"
                  }`}
                >
                  <Sun className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Use dark preview theme"
                  onClick={() => setPreviewTheme("dark")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${
                    previewTheme === "dark"
                      ? "bg-cyan-400 text-gray-950"
                      : "text-current hover:bg-current/10"
                  }`}
                >
                  <Moon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              data-testid="landing-live-renderer"
              data-renderer="react"
              data-framework-target={framework}
              className="min-h-[560px] min-w-0 rounded-lg border border-current/10 bg-gray-50 p-3 dark:bg-gray-900 sm:p-5"
            >
              <UpupUploader
                uploadEndpoint="/api/upup-demo/presign"
                sources={[FileSource.LOCAL, FileSource.URL]}
                maxFiles={previewMode === "mini" ? 1 : 3}
                mini={previewMode === "mini"}
                enablePaste
                folderUpload={{ allowDrop: true, showSelectFolderButton: true }}
                allowPreview
                maxRetries={1}
                maxFileSize={{ size: 25, unit: "MB" }}
                theme={uploaderTheme}
                onFilesUploadComplete={() => {
                  toast.success("Demo upload completed");
                }}
                onError={message => {
                  toast.error(message);
                }}
                onWarn={message => {
                  toast.warn(message);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
