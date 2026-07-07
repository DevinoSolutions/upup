'use client'

import { useEffect, useMemo, useState } from "react";
import { InteractiveExample } from "@upup/interactive-example";
import "@upup/interactive-example/styles";
import Toast from "@/components/Toast";
import { clientEnv } from "@/lib/env";

/**
 * Build a cloudDrives seed from NEXT_PUBLIC_*_CLIENT_ID env vars so the
 * playground shows live drive tiles when the host has credentials and
 * gracefully greys them out with a tooltip when it doesn't. Nothing here
 * ships to consumers — this is only for the playground host app.
 */
function cloudDrivesFromEnv() {
  const out: Record<string, unknown> = {};
  const g = clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (g) {
    out.googleDrive = {
      clientId: g,
      apiKey: clientEnv.NEXT_PUBLIC_GOOGLE_API_KEY,
      appId: clientEnv.NEXT_PUBLIC_GOOGLE_APP_ID,
    };
  }
  const o = clientEnv.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;
  if (o) out.oneDrive = { clientId: o };
  const d = clientEnv.NEXT_PUBLIC_DROPBOX_CLIENT_ID;
  if (d) out.dropbox = { clientId: d };
  const b = clientEnv.NEXT_PUBLIC_BOX_CLIENT_ID;
  if (b) out.box = { clientId: b };
  return Object.keys(out).length > 0 ? out : undefined;
}

type SearchParams = Record<string, string | string[] | undefined>;

function getSearchParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function mockUploadEndpoint(params: SearchParams): string {
  const failure = getSearchParam(params, "mockFailure");
  const run = getSearchParam(params, "mockRun");
  const qs = new URLSearchParams();
  if (failure) qs.set("fail", failure);
  if (run) qs.set("run", run);
  const suffix = qs.toString();
  return `/api/upup-mock/presign${suffix ? `?${suffix}` : ""}`;
}

function paramsFromSearch(search: string): SearchParams {
  return Object.fromEntries(new URLSearchParams(search));
}

export default function Home() {
  const [search, setSearch] = useState("");
  useEffect(() => {
    setSearch(window.location.search);
  }, []);
  const params = useMemo(() => paramsFromSearch(search), [search]);
  const cloudDrives = cloudDrivesFromEnv();
  const uploadEndpoint =
    clientEnv.NEXT_PUBLIC_UPUP_UPLOAD_ENDPOINT ?? mockUploadEndpoint(params);
  const initialConfig = {
    uploadEndpoint,
    ...(cloudDrives ? { cloudDrives } : {}),
  } as never;

  return (
    <div className="container mx-auto" style={{ padding: 24, maxWidth: 1400 }}>
      <p className="text-sm text-gray-600 dark:text-gray-400" style={{ marginBottom: 16, maxWidth: 720 }}>
        Tweak props on the left, see the uploader update on the right. Switch
        to the <strong>Code</strong> tab for a copy-pasteable snippet.
      </p>
      <InteractiveExample
        key={uploadEndpoint}
        defaultExpanded={['upload']}
        initialConfig={initialConfig}
      />
      <Toast />
    </div>
  );
}
