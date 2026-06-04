import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader } from '../index'
import {
    serverErrorArgs,
    serverSuccessArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader/ServerMode',
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
    args: serverSuccessArgs,
}

export const Error: Story = {
    args: serverErrorArgs,
}
