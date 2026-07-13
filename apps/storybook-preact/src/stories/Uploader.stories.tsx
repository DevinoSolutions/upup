import type { Meta, StoryObj } from '@storybook/preact-vite'
import { UpupUploader } from '@upupjs/preact'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upupjs/storybook-config'

// Pull virtual controls (themeMode, primaryColor) out of args and fold them
// into the real `theme` prop that UpupUploader actually accepts.
function render(args: Record<string, unknown>) {
    const { themeMode, primaryColor, ...rest } = args
    const theme = {
        ...(themeMode ? { mode: themeMode } : {}),
        ...(primaryColor
            ? { tokens: { color: { primary: primaryColor } } }
            : {}),
    }
    const props = { ...rest, ...(Object.keys(theme).length ? { theme } : {}) }
    return <UpupUploader {...(props as any)} />
}

// ── Meta ───────────────────────────────────────────────────────────────────────
const meta: Meta<any> = {
    title: 'Preact/Uploader',
    component: UpupUploader as any,
    argTypes: uploaderArgTypes as any,
    args: uploaderDefaultArgs,
    render,
    parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<any>

// ── 1. Playground ─────────────────────────────────────────────────────────────
// All controls live — tweak everything from the SB controls panel.
export const Playground: Story = {}

// ── 2. Basic ──────────────────────────────────────────────────────────────────
// Minimal local-only, single-file, no branding.
export const Basic: Story = {
    args: { sources: ['local'], showBranding: false, maxFiles: 1 },
}

// ── 3. Smoke ──────────────────────────────────────────────────────────────────
// Asserts the uploader root (.upup-scope) mounts into the canvas element.
export const Smoke: Story = {
    play: async ({ canvasElement }) => {
        if (!canvasElement.querySelector('.upup-scope')) {
            throw new Error('Smoke: uploader (.upup-scope) did not mount')
        }
    },
}

// ── 4. LocalOnly ──────────────────────────────────────────────────────────────
// Only the local file-picker tab, no branding.
export const LocalOnly: Story = {
    args: { sources: ['local'], showBranding: false },
}

// ── 5. UrlSource ──────────────────────────────────────────────────────────────
// URL input source only.
export const UrlSource: Story = {
    args: { sources: ['url'], showBranding: false },
}

// ── 6. CameraSource ───────────────────────────────────────────────────────────
// Camera capture source only.
export const CameraSource: Story = {
    args: { sources: ['camera'], showBranding: false },
}

// ── 7. AudioSource ────────────────────────────────────────────────────────────
// Microphone/audio capture source only.
export const AudioSource: Story = {
    args: { sources: ['microphone'], showBranding: false },
}

// ── 8. ScreenSource ───────────────────────────────────────────────────────────
// Screen-share capture source only.
export const ScreenSource: Story = {
    args: { sources: ['screen'], showBranding: false },
}

// ── 9. AllSources ─────────────────────────────────────────────────────────────
// Every available source tab at once.
export const AllSources: Story = {
    args: {
        sources: [
            'local',
            'url',
            'camera',
            'microphone',
            'screen',
            'googleDrive',
            'oneDrive',
            'dropbox',
            'box',
        ],
        showBranding: false,
    },
}

// ── Real storage (MinIO via the @upupjs/server harness on :53060) ──────────────
// Opt-in stories for the real-bytes upload milestone. They DISABLE MSW
// (parameters.msw.handlers = []) and point at the local harness server using
// `serverUrl` (which selects the ServerCredentials strategy -> POST /presign),
// clearing the MSW `uploadEndpoint` default.
// Prereqs (live task): `pnpm e2e:minio:up` + `pnpm e2e:minio:server` running, and
// storybook started with VITE_GOOGLE_CLIENT_ID set for the Google Drive cases.
const REAL_SERVER_URL =
    (import.meta as unknown as { env?: Record<string, string> }).env
        ?.VITE_UPUP_E2E_SERVER_URL || 'http://localhost:53060'

// ── 10. RealUploadClient ──────────────────────────────────────────────────────
// Client-mode presign: hits POST /presign on the real @upupjs/server harness.
// MSW is disabled so requests reach the real local server on :53060.
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

// ── 11. Parity (deterministic DOM fixture — no network, no upload) ────────────
// autoUpload: false → no presign call. No serverUrl/uploadEndpoint → nothing to
// hit. themeMode: 'light' overrides the meta default ('dark') for a consistent
// snapshot. Locale is the component default (en). Used by the parity harness.
export const Parity: Story = {
    parameters: { msw: { handlers: [] } },
    args: {
        mode: 'client',
        autoUpload: false,
        sources: ['local', 'googleDrive'],
        maxFiles: 3,
        showBranding: false,
        themeMode: 'light',
    },
}

// ── 12. RealUploadServerDrive ─────────────────────────────────────────────────
// Server-mode Google Drive: hits the real harness server, streams via Drive API.
// MSW is disabled so requests reach the real local server on :53060.
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

// ── 13. Dark ──────────────────────────────────────────────────────────────────
// Sets themeMode: 'dark' → the render helper splits it into theme.mode = 'dark'.
// T7 will visually verify the dark palette is applied correctly.
export const Dark: Story = {
    args: {
        themeMode: 'dark',
        sources: ['local', 'url'],
        showBranding: false,
    },
}
