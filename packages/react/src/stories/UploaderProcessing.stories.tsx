import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader } from '../index'
import {
    processingFailureArgs,
    processingSuccessArgs,
    processingTimeoutArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader/Processing',
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

export const Success: Story = {
    args: processingSuccessArgs,
}

export const Failure: Story = {
    args: processingFailureArgs,
}

export const Timeout: Story = {
    args: processingTimeoutArgs,
}
