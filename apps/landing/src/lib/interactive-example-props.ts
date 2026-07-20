import type {
    InteractiveExampleProps,
    UpupConfig,
} from '@upupjs/interactive-example'
import { clientEnv } from './env'
import { APP_ID } from './analytics/contract'

type CloudDrives = NonNullable<UpupConfig['cloudDrives']>

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
    return Object.keys(drives).length > 0 ? drives : undefined
}

/**
 * Build the `<InteractiveExample>` props derived from the landing app's env:
 * the AI assistant's Mastra base URL and the cloud-drive credentials. Callers
 * pass any page-specific `base` props (e.g. the per-framework image-editor
 * overrides); cloudDrives is merged INTO `base.initialConfig` so it composes
 * rather than clobbers. When no env is set the returned props are behavior-
 * identical to `base` (AI falls back to localhost, drives stay empty).
 *
 * This is the single place both landing pages read env from, so the two call
 * sites cannot drift.
 */
export function interactiveExampleEnvProps(
    base?: InteractiveExampleProps,
): InteractiveExampleProps {
    const cloudDrives = cloudDrivesFromEnv()
    const baseInitial = base?.initialConfig
    const initialConfig: UpupConfig | undefined = cloudDrives
        ? { ...(baseInitial ?? {}), cloudDrives }
        : baseInitial

    return {
        ...base,
        ...(initialConfig ? { initialConfig } : {}),
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
