// ── Client (NEXT_PUBLIC_* — inlined at build time) ───────────────────────
//
// Deliberately zod-free. This module is imported by client components that
// sit in the ROOT layout (gtag, site-url, the analytics dataset), so whatever
// it imports ships on every page's first load. When it parsed these values
// through a zod schema, the whole zod runtime (~90 KB compressed) rode the
// landing page's critical path to validate strings that cannot fail: every
// field is an optional string, and `process.env.NEXT_PUBLIC_*` is always a
// string or undefined. `?? default` reproduces zod's `.default()` exactly (it
// applies only when the value is undefined, never to an empty string).
//
// Server-side validation stays in `@/lib/env`, which re-exports this object.
// Every read below must stay a literal `process.env.NEXT_PUBLIC_*` access so
// Next can inline it into the client bundle.

export interface ClientEnv {
    NEXT_PUBLIC_BASE_URL?: string
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: string
    NEXT_PUBLIC_GOOGLE_API_KEY: string
    NEXT_PUBLIC_GOOGLE_APP_ID: string
    NEXT_PUBLIC_ONEDRIVE_CLIENT_ID: string
    NEXT_PUBLIC_DROPBOX_CLIENT_ID: string
    NEXT_PUBLIC_BOX_CLIENT_ID: string
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?: string
    NEXT_PUBLIC_POSTHOG_KEY?: string
    NEXT_PUBLIC_POSTHOG_HOST: string
    // Analytics dataset selector, mirrored from the server POSTHOG_DATASET at
    // build time. Kept a plain string (not an enum) so an empty build arg can
    // never crash the client boot — dataset.ts validates the value.
    NEXT_PUBLIC_POSTHOG_DATASET?: string
    // e2e-project credentials — used ONLY when the dataset resolves to 'e2e'.
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST?: string
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN?: string
    // Base URL of the deployed Mastra AI server that powers the Ask-AI panel.
    // Unset → the interactive example falls back to http://localhost:4111.
    NEXT_PUBLIC_MASTRA_BASE_URL?: string
}

export const DEFAULT_POSTHOG_HOST = 'https://posthog.devino.ca'

export const clientEnv: ClientEnv = {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    NEXT_PUBLIC_GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? '',
    NEXT_PUBLIC_GOOGLE_APP_ID: process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? '',
    NEXT_PUBLIC_ONEDRIVE_CLIENT_ID:
        process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID ?? '',
    NEXT_PUBLIC_DROPBOX_CLIENT_ID:
        process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID ?? '',
    NEXT_PUBLIC_BOX_CLIENT_ID: process.env.NEXT_PUBLIC_BOX_CLIENT_ID ?? '',
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:
        process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_DATASET: process.env.NEXT_PUBLIC_POSTHOG_DATASET,
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST:
        process.env.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST,
    NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN:
        process.env.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN,
    NEXT_PUBLIC_MASTRA_BASE_URL: process.env.NEXT_PUBLIC_MASTRA_BASE_URL,
}
