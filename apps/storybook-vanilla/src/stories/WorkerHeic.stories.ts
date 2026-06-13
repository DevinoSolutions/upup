import type { Meta, StoryObj } from '@storybook/html-vite'
import { createUploader } from '@upup/vanilla'
import type { CreateUploaderOptions, UpupInstance } from '@upup/vanilla'
import {
  uploaderArgTypes,
  uploaderDefaultArgs,
  workerHeicArgs,
  workerHeicPlays,
} from '@upup/storybook-config'

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

function mount(canvasElement: HTMLElement, args: Record<string, unknown>) {
  const prior = instances.get(canvasElement)
  if (prior) prior.destroy()
  queueMicrotask(() => {
    const instance = createUploader(canvasElement, buildOptions(args))
    instances.set(canvasElement, instance)
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
