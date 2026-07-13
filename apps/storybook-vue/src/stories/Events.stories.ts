import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '@useupup/vue'
import {
    uploaderArgTypes,
    uploaderDefaultArgs,
} from '@useupup/storybook-config'

const meta: Meta<typeof UpupUploader> = {
    title: 'Vue/Events',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: { ...uploaderDefaultArgs, autoUpload: true },
    render: args => ({
        components: { UpupUploader },
        setup: () => ({ args }),
        template: '<UpupUploader v-bind="args" />',
    }),
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Select a file; lifecycle callbacks log to the Actions panel.',
            },
        },
    },
}
export default meta
type Story = StoryObj<typeof UpupUploader>

export const AllCallbacks: Story = {}
