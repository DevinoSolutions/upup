import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@upup/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

const meta: Meta<UploaderProps> = {
  title: 'React/Image Editor',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: { ...uploaderDefaultArgs, sources: ['local'], allowedFileTypes: 'images' },
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UploaderProps>

export const Enabled: Story = { args: { imageEditor: true } }
export const Disabled: Story = { args: { imageEditor: false } }
