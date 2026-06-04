import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UpupUploaderProps } from '@upup/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

const meta: Meta<UpupUploaderProps> = {
  title: 'React/Image Editor',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: { ...uploaderDefaultArgs, sources: ['local'], allowedFileTypes: 'images' },
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UpupUploaderProps>

export const Enabled: Story = { args: { imageEditor: true } }
export const Disabled: Story = { args: { imageEditor: false } }
