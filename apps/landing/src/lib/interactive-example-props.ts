import type {
    InteractiveExampleProps,
    UpupConfig,
} from '@useupup/interactive-example'
import { clientEnv } from './env'
import { APP_ID } from './analytics/contract'

type CloudDrives = NonNullable<UpupConfig['cloudDrives']>

/**
 * Where the demo's Upload button sends files. The landing app mounts
 * @useupup/server at /api/upup (src/app/api/upup/[...path]/route.ts), and its
 * /presign route also answers the client-mode token-endpoint contract
 * (POST {name,size,type} → {key, uploadUrl, …}). Both targets are seeded; the
 * preview and the Code tab each keep only the one matching the selected mode
 * (see normalizeRuntimeConfig / generateCode in @useupup/interactive-example),
 * so a visitor who flips to server mode keeps a working demo.
 *
 * Without these the demo shipped with no upload target at all, so every
 * Upload click on the homepage ended in NO_UPLOAD_TARGET.
 *
 * Trailing slash on the endpoint: the site runs trailingSlash:true, and an
 * unslashed POST would take a 308 hop first.
 */
export const DEMO_UPLOAD_TARGETS = {
    uploadEndpoint: '/api/upup/presign/',
    serverUrl: '/api/upup',
} as const satisfies Pick<UpupConfig, 'uploadEndpoint' | 'serverUrl'>

/**
 * Seed cloud-drive credentials into the interactive demo from the landing app's
 * build-time public env, so the homepage uploader can actually open Google
 * Drive / OneDrive / Dropbox instead of rendering with the empty ConfigContext
 * defaults.
 *
 * Each provider is included ONLY when its client id is set — an empty string
 * would advertise a broken provider and would clobber an id the visitor pastes
 * into the sidebar. Google Drive's config requires all three fields, so its
 * apiKey/appId are taken from env too (both schema-default to '').
 */
function cloudDrivesFromEnv(): CloudDrives | undefined {
    const drives: CloudDrives = {}
    if (clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        drives.googleDrive = {
            clientId: clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            apiKey: clientEnv.NEXT_PUBLIC_GOOGLE_API_KEY,
            appId: clientEnv.NEXT_PUBLIC_GOOGLE_APP_ID,
        }
    }
    if (clientEnv.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID) {
        drives.oneDrive = { clientId: clientEnv.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID }
    }
    if (clientEnv.NEXT_PUBLIC_DROPBOX_CLIENT_ID) {
        drives.dropbox = { clientId: clientEnv.NEXT_PUBLIC_DROPBOX_CLIENT_ID }
    }
    if (clientEnv.NEXT_PUBLIC_BOX_CLIENT_ID) {
        drives.box = { clientId: clientEnv.NEXT_PUBLIC_BOX_CLIENT_ID }
    }
    return Object.keys(drives).length > 0 ? drives : undefined
}

/**
 * Build the `<InteractiveExample>` props derived from the landing app's env:
 * the AI assistant's Mastra base URL and the cloud-drive credentials. Callers
 * pass any page-specific `base` props (e.g. the per-framework image-editor
 * overrides); the demo upload targets and cloudDrives are merged INTO
 * `base.initialConfig` so they compose rather than clobber (a base that sets
 * its own target wins). When no env is set the AI falls back to localhost and
 * drives stay empty; the upload targets are always present.
 *
 * This is the single place both landing pages read env from, so the two call
 * sites cannot drift.
 */
export function interactiveExampleEnvProps(
    base?: InteractiveExampleProps,
): InteractiveExampleProps {
    const cloudDrives = cloudDrivesFromEnv()
    const baseInitial = base?.initialConfig
    // Drives with credentials are enabled BY DEFAULT: seed `sources` with
    // every configured drive (mirrors the playground's seeding) so the demo
    // shows them without the visitor touching the Sources panel. A base that
    // sets its own `sources` still wins.
    const initialConfig: UpupConfig = {
        ...DEMO_UPLOAD_TARGETS,
        ...(baseInitial ?? {}),
        ...(cloudDrives
            ? {
                  cloudDrives,
                  sources: baseInitial?.sources ?? [
                      'local',
                      ...(Object.keys(cloudDrives) as (keyof CloudDrives)[]),
                      'url',
                      'camera',
                      'microphone',
                      'screen',
                  ],
              }
            : {}),
    }

    return {
        ...base,
        initialConfig,
        // Always tag the AI panel with the landing app id so traces + thumbs
        // events share an `app_id`. The client-only pieces (visitor distinct
        // id + the onAiFeedback sink) are injected by InteractiveExampleClient,
        // not here — a function prop can't cross the RSC boundary.
        aiAssistant: {
            ...base?.aiAssistant,
            appId: APP_ID,
            ...(clientEnv.NEXT_PUBLIC_MASTRA_BASE_URL
                ? { mastraBaseUrl: clientEnv.NEXT_PUBLIC_MASTRA_BASE_URL }
                : {}),
        },
    }
}
