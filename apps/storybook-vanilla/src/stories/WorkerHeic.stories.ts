import type { Meta, StoryObj } from '@storybook/html-vite'
import { createUploader } from '@upup/vanilla'
import type { CreateUploaderOptions, UpupInstance } from '@upup/vanilla'
import {
  uploaderArgTypes,
  uploaderDefaultArgs,
  workerHeicArgs,
  workerHeicPlays,
} from '@upup/storybook-config'

// Per-canvas mount record: the uploader instance plus the dedicated child host it
// renders into. Keyed by canvasElement (Storybook reuses it across remounts).
type Mounted = { instance: UpupInstance; host: HTMLElement }
const mounts = new WeakMap<HTMLElement, Mounted>()

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

// Mount into a FRESH child <div> per mount, never into canvasElement directly.
// `render` returns '' so Storybook runs `canvasElement.innerHTML = ''` after this
// fn returns; on forceRemount that wipes the canvas out from under lit-html's stored
// ChildPart, ejecting its marker nodes -> "ChildPart has no parentNode" and tiles:0.
// A new host each mount keeps the stale part on the discarded child (mirroring the
// React/Vue/Svelte/Preact renderers, which mount into their own root), so the story
// survives interactive remount. The queueMicrotask defers past Storybook's wipe; the
// prior teardown runs inside it so racing mounts can't leak an instance.
function mount(canvasElement: HTMLElement, args: Record<string, unknown>) {
  queueMicrotask(() => {
    const prior = mounts.get(canvasElement)
    if (prior) prior.instance.destroy()
    canvasElement.replaceChildren()
    const host = document.createElement('div')
    canvasElement.appendChild(host)
    const instance = createUploader(host, buildOptions(args))
    mounts.set(canvasElement, { instance, host })
  })
}

const meta: Meta = {
  title: 'Vanilla/WorkerHeic',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  argTypes: uploaderArgTypes as any,
  args: uploaderDefaultArgs,
  render: (args, { canvasElement }) => {
    mount(canvasElement as HTMLElement, args as Record<string, unknown>)
    return ''
  },
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj

export const HeicConversion: Story = { args: workerHeicArgs.heicConversion, play: workerHeicPlays.heicConversion }
export const WebWorkerOffload: Story = { args: workerHeicArgs.webWorkerOffload, play: workerHeicPlays.webWorkerOffload }
export const MainThreadFallback: Story = { args: workerHeicArgs.mainThreadFallback, play: workerHeicPlays.mainThreadFallback }
