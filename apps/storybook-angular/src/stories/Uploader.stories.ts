// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig, moduleMetadata } from '@storybook/angular'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import { UpupUploaderComponent } from '@upup/angular'
import type { UpupUploaderProps } from '@upup/angular'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

// ── REAL_SERVER_URL (webpack-safe) ─────────────────────────────────────────────
// The Angular storybook uses webpack, not Vite — import.meta.env is not defined.
// Storybook exposes env vars prefixed with STORYBOOK_ on process.env (webpack
// injects them via EnvironmentPlugin). Falls back to the MinIO harness default.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _proc: any = typeof (globalThis as any).process !== 'undefined' ? (globalThis as any).process : {}
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const REAL_SERVER_URL: string = (_proc?.env?.STORYBOOK_UPUP_E2E_SERVER_URL as string | undefined) ?? 'http://localhost:53060'

// ── buildOptions: split virtual args out into the `theme` sub-object ──────────
function buildOptions(args: Record<string, unknown>): UpupUploaderProps {
  const { themeMode, primaryColor, ...rest } = args
  const theme: Record<string, unknown> = {
    ...(themeMode ? { mode: themeMode } : {}),
    ...(primaryColor ? { tokens: { color: { primary: primaryColor } } } : {}),
  }
  return {
    ...(rest as UpupUploaderProps),
    ...(Object.keys(theme).length ? { theme: theme as UpupUploaderProps['theme'] } : {}),
  }
}

// ── Shared decorators & render ─────────────────────────────────────────────────
// Each story reuses the meta-level render so individual stories only set
// args / parameters / play. The render fn maps buildOptions(args) → config input.
//
// We intentionally type Meta/StoryObj loosely (no component generic) so the flat
// argTypes from @upup/storybook-config (sources, showBranding, themeMode, etc.)
// are accepted on each story's `args` without fighting Angular's signal-input
// type derivation (StoryObj<UpupUploaderComponent> would narrow args to only the
// @Input() properties of the component, which is just `config`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta: Meta<any> = {
  title: 'Angular/Uploader',
  component: UpupUploaderComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
    moduleMetadata({
      imports: [UpupUploaderComponent],
    }),
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  argTypes: uploaderArgTypes as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: uploaderDefaultArgs as any,
  render: (args) => ({
    props: { config: buildOptions(args as Record<string, unknown>) },
    template: `<upup-uploader [config]="config" style="display:block;width:480px;height:420px"></upup-uploader>`,
  }),
  parameters: { layout: 'padded' },
}

export default meta

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>

// ── 1. Playground ──────────────────────────────────────────────────────────────
// Default args + all controls — the interactive sandbox story.
export const Playground: Story = {}

// ── 2. Basic ──────────────────────────────────────────────────────────────────
export const Basic: Story = {
  args: { sources: ['local'], showBranding: false, maxFiles: 1 },
}

// ── 3. Smoke ──────────────────────────────────────────────────────────────────
// Asserts the component mounts and renders the .upup-scope root node.
export const Smoke: Story = {
  args: { sources: ['local'], showBranding: false },
  play: async ({ canvasElement }) => {
    // Give Angular's change detection + the component's AfterViewInit a tick
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    if (!canvasElement.querySelector('.upup-scope')) {
      throw new Error('Smoke: uploader (.upup-scope) did not mount')
    }
  },
}

// ── 4. LocalOnly ──────────────────────────────────────────────────────────────
export const LocalOnly: Story = {
  args: { sources: ['local'], showBranding: false },
}

// ── 5. UrlSource ──────────────────────────────────────────────────────────────
// NOTE: source key is 'url' (NOT 'link').
export const UrlSource: Story = {
  args: { sources: ['url'], showBranding: false },
}

// ── 6. CameraSource ───────────────────────────────────────────────────────────
export const CameraSource: Story = {
  args: { sources: ['camera'], showBranding: false },
}

// ── 7. AudioSource ────────────────────────────────────────────────────────────
export const AudioSource: Story = {
  args: { sources: ['microphone'], showBranding: false },
}

// ── 8. ScreenSource ───────────────────────────────────────────────────────────
export const ScreenSource: Story = {
  args: { sources: ['screen'], showBranding: false },
}

// ── 9. AllSources ─────────────────────────────────────────────────────────────
export const AllSources: Story = {
  args: {
    sources: ['local', 'url', 'camera', 'microphone', 'screen', 'googleDrive', 'oneDrive', 'dropbox', 'box'],
    showBranding: false,
  },
}

// ── 10. RealUploadClient ──────────────────────────────────────────────────────
// Opt-in: disable MSW + point at the real MinIO harness (:53060).
// Prereqs (live task T18): `pnpm e2e:minio:up` + `pnpm e2e:minio:server` running.
// Set STORYBOOK_UPUP_E2E_SERVER_URL env var to override the default :53060.
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
// snapshot. Angular reads env via process.env (same as REAL_SERVER_URL pattern);
// no server URL needed here. Locale is the component default (en).
// Used by the parity harness.
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

// ── 13. RealUploadServerDrive ─────────────────────────────────────────────────
// Opt-in: disable MSW + server-mode presign via @upup/server on :53060.
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

// ── 14. Dark ──────────────────────────────────────────────────────────────────
// Sets themeMode: 'dark' → buildOptions splits it into theme.mode = 'dark'.
// Angular equivalent of Vanilla's ElementTag (Angular has no custom-element variant).
// T18 will visually verify the dark palette is applied correctly.
export const Dark: Story = {
  args: {
    themeMode: 'dark',
    sources: ['local', 'url'],
    showBranding: false,
  },
}
