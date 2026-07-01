import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@upup/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

const meta: Meta<UploaderProps> = {
  title: 'React/Limits',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: uploaderDefaultArgs,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UploaderProps>

export const SingleFile: Story = { args: { maxFiles: 1 } }
export const ImagesOnly: Story = { args: { allowedFileTypes: 'images' } }
export const PdfOnly: Story = { args: { allowedFileTypes: 'application/pdf' } }
export const TenFilesMax: Story = { args: { maxFiles: 10 } }
