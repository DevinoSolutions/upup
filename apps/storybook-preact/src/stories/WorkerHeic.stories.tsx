import type { Meta, StoryObj } from '@storybook/preact-vite'
import { UpupUploader } from '@upup/preact'
import {
  uploaderArgTypes,
  uploaderDefaultArgs,
  workerHeicArgs,
  workerHeicPlays,
} from '@upup/storybook-config'

function render(args: Record<string, unknown>) {
  const { themeMode, primaryColor, ...rest } = args
  const theme = {
    ...(themeMode ? { mode: themeMode } : {}),
    ...(primaryColor ? { tokens: { color: { primary: primaryColor } } } : {}),
  }
  const props = { ...rest, ...(Object.keys(theme).length ? { theme } : {}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <UpupUploader {...(props as any)} />
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta: Meta<any> = {
  title: 'Preact/WorkerHeic',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: UpupUploader as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  argTypes: uploaderArgTypes as any,
  args: uploaderDefaultArgs,
  render,
  parameters: { layout: 'padded' },
}
export default meta
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>

export const HeicConversion: Story = { args: workerHeicArgs.heicConversion, play: workerHeicPlays.heicConversion }
export const WebWorkerOffload: Story = { args: workerHeicArgs.webWorkerOffload, play: workerHeicPlays.webWorkerOffload }
export const MainThreadFallback: Story = { args: workerHeicArgs.mainThreadFallback, play: workerHeicPlays.mainThreadFallback }
