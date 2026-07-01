import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '@upup/vue'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

function buildProps(args: Record<string, unknown>) {
  const { themeMode, primaryColor, ...rest } = args
  const theme = {
    ...(themeMode ? { mode: themeMode } : {}),
    ...(primaryColor ? { tokens: { color: { primary: primaryColor } } } : {}),
  }
  return { ...rest, ...(Object.keys(theme).length ? { theme } : {}) }
}

const meta: Meta<typeof UpupUploader> = {
  title: 'Vue/Uploader',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: uploaderDefaultArgs,
  render: (args) => ({
    components: { UpupUploader },
    setup() {
      return { props: buildProps(args as Record<string, unknown>) }
    },
    template: '<UpupUploader v-bind="props" />',
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

// ── Real storage (MinIO via the @upup/server harness on :53060) ──────────────
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
    // themeMode is a virtual arg (not in UploaderProps) handled by buildProps;
    // cast mirrors the meta-level uploaderDefaultArgs (Record<string,unknown>).
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
