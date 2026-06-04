import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '../index'
import {
    baseUploaderArgs,
    themeSlotsArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta = {
    title: 'Uploader/Theme',
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

export const Light: Story = {
    args: {
        ...baseUploaderArgs,
        theme: { mode: 'light' },
    },
}

export const Dark: Story = {
    args: {
        ...baseUploaderArgs,
        theme: { mode: 'dark' },
    },
}

export const SlotOverrides: Story = {
    args: themeSlotsArgs,
}
