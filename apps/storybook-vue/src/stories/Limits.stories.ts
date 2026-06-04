import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '@upup/vue'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

const meta: Meta<typeof UpupUploader> = {
  title: 'Vue/Limits',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: uploaderDefaultArgs,
  render: (args) => ({
    components: { UpupUploader },
    setup: () => ({ args }),
    template: '<UpupUploader v-bind="args" />',
  }),
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof UpupUploader>

export const SingleFile: Story = { args: { maxFiles: 1 } }
export const ImagesOnly: Story = { args: { allowedFileTypes: 'images' } }
export const PdfOnly: Story = { args: { allowedFileTypes: 'application/pdf' } }
export const TenFilesMax: Story = { args: { maxFiles: 10 } }
