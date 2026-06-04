import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '../index'
import {
    processingFailureArgs,
    processingSuccessArgs,
    processingTimeoutArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta = {
    title: 'Uploader/Processing',
    component: UpupUploader,
    render: (args) => ({
        components: { UpupUploader },
        setup() {
            return { args, uploaderCanvasStyle }
        },
        template: `
            <div :style="uploaderCanvasStyle">
                <UpupUploader v-bind="args" />
            </div>
        `,
    }),
} satisfies Meta<typeof UpupUploader>

export default meta

type Story = StoryObj<typeof meta>

export const Success: Story = {
    args: processingSuccessArgs,
}

export const Failure: Story = {
    args: processingFailureArgs,
}

export const Timeout: Story = {
    args: processingTimeoutArgs,
}
