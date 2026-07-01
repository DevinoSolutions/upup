import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@upup/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

const meta: Meta<UploaderProps> = {
  title: 'React/Sources',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: uploaderDefaultArgs,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UploaderProps>

export const DeviceOnly: Story = { args: { sources: ['local'] } }
export const DeviceAndCamera: Story = { args: { sources: ['local', 'camera'] } }
export const WithUrlImport: Story = { args: { sources: ['local', 'url'] } }
export const AllCloudDrives: Story = {
  args: { sources: ['local', 'googleDrive', 'oneDrive', 'dropbox', 'box'] },
}
