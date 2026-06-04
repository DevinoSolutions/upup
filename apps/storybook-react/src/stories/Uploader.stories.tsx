import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UpupUploaderProps } from '@upup/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

// Pull virtual controls out of args and fold them into the real `theme` prop.
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
  title: 'React/Uploader',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: uploaderDefaultArgs,
  render,
  parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<UpupUploaderProps>

export const Playground: Story = {}

export const Basic: Story = {
  args: { sources: ['local'], showBranding: false, maxFiles: 1 },
}
