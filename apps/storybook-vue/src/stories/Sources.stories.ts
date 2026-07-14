import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '@upupjs/vue'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upupjs/storybook-config'

const meta: Meta<typeof UpupUploader> = {
    title: 'Vue/Sources',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    render: args => ({
        components: { UpupUploader },
        setup: () => ({ args }),
        template: '<UpupUploader v-bind="args" />',
    }),
    parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof UpupUploader>

export const DeviceOnly: Story = { args: { sources: ['local'] } }
export const DeviceAndCamera: Story = { args: { sources: ['local', 'camera'] } }
export const WithUrlImport: Story = { args: { sources: ['local', 'url'] } }
export const AllCloudDrives: Story = {
    args: { sources: ['local', 'googleDrive', 'oneDrive', 'dropbox', 'box'] },
}
