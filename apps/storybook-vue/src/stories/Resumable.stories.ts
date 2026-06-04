import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '@upup/vue'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

const meta: Meta<typeof UpupUploader> = {
  title: 'Vue/Resumable',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: { ...uploaderDefaultArgs, autoUpload: true },
  render: (args) => ({
    components: { UpupUploader },
    setup: () => ({ args }),
    template: '<UpupUploader v-bind="args" />',
  }),
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof UpupUploader>

export const Multipart: Story = { args: { resumable: { protocol: 'multipart' } } }
