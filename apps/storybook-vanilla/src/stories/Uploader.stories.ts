import type { Meta, StoryObj } from '@storybook/html-vite'
import { createUploader } from '@upup/vanilla'
import type { CreateUploaderOptions, UpupInstance } from '@upup/vanilla'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

// ── Per-canvas instance tracking ──────────────────────────────────────────────
// WeakMap keyed by canvasElement so each story's instance is destroyed before
// re-creating on args change, matching svelte's component lifecycle.
const instances = new WeakMap<HTMLElement, UpupInstance>()

function buildOptions(args: Record<string, unknown>): CreateUploaderOptions {
  const { themeMode, primaryColor, ...rest } = args
  const theme: Record<string, unknown> = {
    ...(themeMode ? { mode: themeMode } : {}),
    ...(primaryColor ? { tokens: { color: { primary: primaryColor } } } : {}),
  }
  return {
    ...(rest as CreateUploaderOptions),
    ...(Object.keys(theme).length ? { theme: theme as CreateUploaderOptions['theme'] } : {}),
  }
}

function mount(canvasElement: HTMLElement, args: Record<string, unknown>): void {
  // Destroy previous instance if any
  const prev = instances.get(canvasElement)
  if (prev) {
    prev.destroy()
    canvasElement.innerHTML = ''
  }
  // Defer slightly so SB has finished its own DOM setup
  queueMicrotask(() => {
    const instance = createUploader(canvasElement, buildOptions(args))
    instances.set(canvasElement, instance)
  })
}

// ── Meta ───────────────────────────────────────────────────────────────────────
const meta: Meta = {
  title: 'Vanilla/Uploader',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  argTypes: uploaderArgTypes as any,
  args: uploaderDefaultArgs,
  render: (args, { canvasElement }) => {
    mount(canvasElement, args as Record<string, unknown>)
    // html-vite render fn must return a string (or empty string — the real DOM
    // is imperatively written into canvasElement by mount())
    return ''
  },
  parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj

export const Playground: Story = {}

export const Basic: Story = {
  args: { sources: ['local'], showBranding: false, maxFiles: 1 },
}

export const Smoke: Story = {
  play: async ({ canvasElement }) => {
    // Give the microtask queue a chance to run createUploader
    await new Promise<void>((r) => setTimeout(r, 50))
    if (!canvasElement.querySelector('.upup-scope')) {
      throw new Error('Smoke: uploader (.upup-scope) did not mount')
    }
  },
}

export const LocalOnly: Story = {
  args: { sources: ['local'], showBranding: false },
}

export const UrlSource: Story = {
  args: { sources: ['url'], showBranding: false },
}

export const CameraSource: Story = {
  args: { sources: ['camera'], showBranding: false },
}

export const AudioSource: Story = {
  args: { sources: ['microphone'], showBranding: false },
}

export const ScreenSource: Story = {
  args: { sources: ['screen'], showBranding: false },
}

export const AllSources: Story = {
  args: {
    sources: ['local', 'url', 'camera', 'microphone', 'screen', 'googleDrive', 'oneDrive', 'dropbox', 'box'],
    showBranding: false,
  },
}

// ── Real storage (MinIO via the @upup/server harness on :53060) ──────────────
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

// ── Custom Element story ───────────────────────────────────────────────────────
// Demonstrates the <upup-uploader> custom element registered by @upup/vanilla/element.
import '@upup/vanilla/element'

export const ElementTag: Story = {
  args: {
    sources: ['local', 'url'],
    showBranding: false,
    maxFiles: 5,
  },
  render: (args) => {
    const opts = buildOptions(args as Record<string, unknown>)
    // Return an HTML string; the custom element is registered by the import above.
    // We set .config via a script tag that runs after the element is connected.
    const id = `upup-el-${Math.random().toString(36).slice(2)}`
    // Schedule config assignment after the element connects to the DOM
    queueMicrotask(() => {
      const el = document.getElementById(id) as (HTMLElement & { config: CreateUploaderOptions }) | null
      if (el) el.config = opts
    })
    return `<upup-uploader id="${id}"></upup-uploader>`
  },
  parameters: { layout: 'padded' },
}
