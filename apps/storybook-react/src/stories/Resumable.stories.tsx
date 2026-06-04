import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UpupUploaderProps } from '@upup/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

const meta: Meta<UpupUploaderProps> = {
  title: 'React/Resumable',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: { ...uploaderDefaultArgs, autoUpload: true },
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UpupUploaderProps>

export const Multipart: Story = { args: { resumable: { protocol: 'multipart' } } }
