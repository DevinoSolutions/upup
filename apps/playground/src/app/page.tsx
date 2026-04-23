'use client'
import { InteractiveExample } from "@upup/interactive-example";
import "@upup/interactive-example/styles";
import Toast from "@/components/Toast";

/**
 * Build a cloudDrives seed from NEXT_PUBLIC_*_CLIENT_ID env vars so the
 * playground shows live drive tiles when the host has credentials and
 * gracefully greys them out with a tooltip when it doesn't. Nothing here
 * ships to consumers — this is only for the playground host app.
 */
function cloudDrivesFromEnv() {
  const out: Record<string, unknown> = {};
  const g = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (g) {
    out.googleDrive = {
      clientId: g,
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "",
      appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? "",
    };
  }
  const o = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;
  if (o) out.oneDrive = { clientId: o };
  const d = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID;
  if (d) out.dropbox = { clientId: d };
  const b = process.env.NEXT_PUBLIC_BOX_CLIENT_ID;
  if (b) out.box = { clientId: b };
  return Object.keys(out).length > 0 ? out : undefined;
}

export default function Home() {
  const cloudDrives = cloudDrivesFromEnv();
  return (
    <div className="container mx-auto" style={{ padding: 24, maxWidth: 1400 }}>
      <p className="text-sm text-gray-600 dark:text-gray-400" style={{ marginBottom: 16, maxWidth: 720 }}>
        Tweak props on the left, see the uploader update on the right.
        Switch to the <strong>Code</strong> tab for a copy-pasteable snippet, or
        share your config with <strong>Copy permalink</strong>.
      </p>
      <InteractiveExample
        defaultExpanded={['upload']}
        initialConfig={cloudDrives ? { cloudDrives } as never : undefined}
      />
      <Toast />
    </div>
  );
}
