// src/cloudDrives.ts
// Builds the UpupUploader `cloudDrives` prop from environment variables so the
// Storybook cloud-drive stories can perform REAL OAuth (Google Drive / OneDrive
// / Dropbox / Box) when secrets are provided — matching what a consuming app
// wires up. Variables are read from Vite's `import.meta.env`, so they MUST be
// prefixed `VITE_` to be exposed to the browser bundle.
//
// Set them per app in an untracked env file (e.g. apps/storybook-react/.env.local;
// see the matching .env.example):
//   VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_API_KEY, VITE_GOOGLE_APP_ID
//   VITE_ONEDRIVE_CLIENT_ID, VITE_ONEDRIVE_REDIRECT_URI
//   VITE_DROPBOX_CLIENT_ID,  VITE_DROPBOX_REDIRECT_URI
//   VITE_BOX_CLIENT_ID,      VITE_BOX_REDIRECT_URI
//
// When a provider's vars are absent its fields are empty strings. That is
// deliberate: the adapter still mounts its real "Sign in with <provider>" screen
// (never a blank panel), and supplying the vars upgrades that to a working OAuth
// sign-in without any code change.

export type CloudDrivesConfig = {
  googleDrive?: { clientId: string; apiKey: string; appId: string }
  oneDrive?: { clientId: string; redirectUri?: string }
  dropbox?: { clientId: string; redirectUri?: string }
  box?: { clientId: string; redirectUri?: string }
}

type EnvRecord = Record<string, string | undefined>

const read = (env: EnvRecord, key: string) => (env[key] ?? '').trim()

/**
 * Pure builder — maps an env record (+ an origin fallback for redirect URIs)
 * into a `cloudDrives` object. Every provider is always present so the adapter
 * reaches its real auth screen instead of the empty "not ready" panel.
 */
export function buildCloudDrives(env: EnvRecord, origin = ''): CloudDrivesConfig {
  return {
    googleDrive: {
      clientId: read(env, 'VITE_GOOGLE_CLIENT_ID'),
      apiKey: read(env, 'VITE_GOOGLE_API_KEY'),
      appId: read(env, 'VITE_GOOGLE_APP_ID'),
    },
    oneDrive: {
      clientId: read(env, 'VITE_ONEDRIVE_CLIENT_ID'),
      redirectUri: read(env, 'VITE_ONEDRIVE_REDIRECT_URI') || origin,
    },
    dropbox: {
      clientId: read(env, 'VITE_DROPBOX_CLIENT_ID'),
      redirectUri: read(env, 'VITE_DROPBOX_REDIRECT_URI') || origin,
    },
    box: {
      clientId: read(env, 'VITE_BOX_CLIENT_ID'),
      redirectUri: read(env, 'VITE_BOX_REDIRECT_URI') || origin,
    },
  }
}

/**
 * Reads Vite's `import.meta.env` and the current window origin at call time.
 * Falls back to an empty env (→ all "Sign in" screens) when neither is present,
 * e.g. under a non-Vite test runner.
 */
export function cloudDrivesFromEnv(): CloudDrivesConfig {
  const env = (import.meta as unknown as { env?: EnvRecord }).env ?? {}
  const origin =
    typeof window !== 'undefined' && window.location ? window.location.origin : ''
  return buildCloudDrives(env, origin)
}
