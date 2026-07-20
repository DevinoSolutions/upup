import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@upupjs/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upupjs/storybook-config'

// Pull virtual controls out of args and fold them into the real `theme` prop.
function render(args: Record<string, unknown>) {
    const { themeMode, primaryColor, ...rest } = args
    const theme = {
        ...(themeMode ? { mode: themeMode } : {}),
        ...(primaryColor
            ? { tokens: { color: { primary: primaryColor } } }
            : {}),
    }
    const props = { ...rest, ...(Object.keys(theme).length ? { theme } : {}) }
    return <UpupUploader {...(props as UploaderProps)} />
}

const meta: Meta<UploaderProps> = {
    title: 'React/Uploader',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    render,
    parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<UploaderProps>

export const Playground: Story = {}

// Per-variant Playground for the a11y-overflow 4b sweep (keys on
// `<fw>-uploader--playground-<variant>`). Same defaults as Playground; the
// distinct story id is the only thing the sweep needs.
export const PlaygroundHero: Story = {}

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

// ── Real storage (MinIO via the @upupjs/server harness on :53060) ──────────────
// Opt-in story for the cross-framework e2e smoke. DISABLES MSW and points at the
// local harness via `serverUrl` (selects the ServerCredentials strategy -> POST
// /presign), clearing the MSW `uploadEndpoint` default. `sources: ['local']`
// keeps the smoke OAuth-free. Prereqs (live/e2e only): the MinIO + harness infra
// from the e2e globalSetup (or `pnpm e2e:minio:up` + `pnpm e2e:minio:server`).
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
        sources: ['local'],
        maxFiles: 3,
        showBranding: false,
    },
}

// ── Parity (deterministic DOM fixture — no network, no upload) ────────────────
// autoUpload: false → no presign call. No serverUrl/uploadEndpoint → nothing to
// hit. themeMode: 'light' overrides the meta default ('dark') for a consistent
// snapshot. Locale is the component default (en). Used by the parity harness.
export const Parity: Story = {
    parameters: { msw: { handlers: [] } },
    // themeMode is a virtual arg (not in UploaderProps) handled by the render
    // helper; cast mirrors the meta-level uploaderDefaultArgs (Record<string,unknown>).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: {
        mode: 'client',
        autoUpload: false,
        sources: ['local', 'googleDrive'],
        maxFiles: 3,
        showBranding: false,
        themeMode: 'light',
        // The image editor is react/preact-only (other frameworks stub it), so
        // its edit-button DOM stays OUT of the cross-framework parity contract.
        // Pin it off here even though core now defaults it on.
        imageEditor: false,
    } as any,
}

// Parity fixture for the single-file HERO state (exactly one file → FileHero,
// not the card list). IDENTICAL args to `Parity`; the parity spec seeds one
// file for this variant instead of two. Locale/theme match `Parity` so only the
// file-count-driven DOM differs.
export const ParityHero: Story = {
    parameters: Parity.parameters,
    args: Parity.args,
}
