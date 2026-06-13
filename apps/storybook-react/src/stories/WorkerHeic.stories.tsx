import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UpupUploaderProps } from '@upup/react'
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
  return <UpupUploader {...(props as UpupUploaderProps)} />
}

const meta: Meta<UpupUploaderProps> = {
  title: 'React/WorkerHeic',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: uploaderDefaultArgs,
  render,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UpupUploaderProps>

export const HeicConversion: Story = {
  args: workerHeicArgs.heicConversion,
  play: workerHeicPlays.heicConversion,
}
export const WebWorkerOffload: Story = {
  args: workerHeicArgs.webWorkerOffload,
  play: workerHeicPlays.webWorkerOffload,
}
export const MainThreadFallback: Story = {
  args: workerHeicArgs.mainThreadFallback,
  play: workerHeicPlays.mainThreadFallback,
}
