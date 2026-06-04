import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '../index'
import {
    messageOverrideArgs,
    rtlUploaderArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta = {
    title: 'Uploader/I18n',
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

export const RTL: Story = {
    args: rtlUploaderArgs,
}

export const MessageOverrides: Story = {
    args: messageOverrideArgs,
}
