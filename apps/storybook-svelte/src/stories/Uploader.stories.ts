import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { UpupUploader } from '@useupup/svelte'
import {
    uploaderArgTypes,
    uploaderDefaultArgs,
} from '@useupup/storybook-config'

function buildProps(args: Record<string, unknown>) {
    const { themeMode, primaryColor, ...rest } = args
    const theme = {
        ...(themeMode ? { mode: themeMode } : {}),
        ...(primaryColor
            ? { tokens: { color: { primary: primaryColor } } }
            : {}),
    }
    return { ...rest, ...(Object.keys(theme).length ? { theme } : {}) }
}

const meta: Meta<typeof UpupUploader> = {
    title: 'Svelte/Uploader',
    component: UpupUploader as unknown as Meta<
        typeof UpupUploader
    >['component'],
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: args => ({
        Component: UpupUploader,
        props: buildProps(args as Record<string, unknown>) as any,
    }),
    parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<typeof UpupUploader>

export const Playground: Story = {}

export const Basic: Story = {
    args: { sources: ['local'], showBranding: false, maxFiles: 1 },
}

export const Smoke: Story = {
    play: async ({ canvasElement }) => {
        if (!canvasElement.querySelector('.upup-scope')) {
            throw new Error('Smoke: uploader (.upup-scope) did not mount')
        }
    },
}

// ── Real storage (MinIO via the @useupup/server harness on :53060) ──────────────
// Opt-in stories for the real-bytes upload milestone. They DISABLE MSW
// (parameters.msw.handlers = []) and point at the local harness server using
// `serverUrl` (which selects the ServerCredentials strategy -> POST /presign),
// clearing the MSW `uploadEndpoint` default.
// Prereqs (live task): `pnpm e2e:minio:up` + `pnpm e2e:minio:server` running, and
// storybook started with VITE_GOOGLE_CLIENT_ID set for the Google Drive cases.
const REAL_SERVER_URL =
    (import.meta as unknown as { env?: Record<string, string> }).env
        ?.VITE_UPUP_E2E_SERVER_URL || 'http://localhost:53060'

export const RealUploadClient: Story = {
    parameters: { msw: { handlers: [] } },
    args: {
        serverUrl: REAL_SERVER_URL,
        uploadEndpoint: undefined,
        mode: 'client',
        autoUpload: true,
        sources: ['local', 'googleDrive'],
        maxFiles: 3,
        showBranding: false,
    },
}

// ── Parity (deterministic DOM fixture — no network, no upload) ────────────────
// autoUpload: false → no presign call. No serverUrl/uploadEndpoint → nothing to
// hit. themeMode: 'light' overrides the meta default ('dark') for a consistent
// snapshot. Locale is the component default (en). Used by the parity harness.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Parity: Story = {
    parameters: { msw: { handlers: [] } },
    // themeMode is a virtual arg (not in UploaderProps) — cast mirrors the
    // existing render: props cast and meta args shape (uploaderDefaultArgs has it).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: {
        mode: 'client',
        autoUpload: false,
        sources: ['local', 'googleDrive'],
        maxFiles: 3,
        showBranding: false,
        themeMode: 'light',
    } as any,
}

export const RealUploadServerDrive: Story = {
    parameters: { msw: { handlers: [] } },
    args: {
        serverUrl: REAL_SERVER_URL,
        uploadEndpoint: undefined,
        mode: 'server',
        autoUpload: true,
        sources: ['googleDrive'],
        maxFiles: 3,
        showBranding: false,
    },
}
