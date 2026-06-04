import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader } from '../index'
import {
    messageOverrideArgs,
    rtlUploaderArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader/I18n',
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

export const RTL: Story = {
    args: rtlUploaderArgs,
}

export const MessageOverrides: Story = {
    args: messageOverrideArgs,
}
