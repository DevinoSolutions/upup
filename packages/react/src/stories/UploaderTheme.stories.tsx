import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader } from '../index'
import {
    baseUploaderArgs,
    themeSlotsArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader/Theme',
    component: UpupUploader,
    decorators: [
        (Story) => (
            <div style={uploaderCanvasStyle}>
                <Story />
            </div>
        ),
    ],
}

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
