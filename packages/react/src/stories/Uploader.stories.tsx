import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, waitFor, within } from 'storybook/test'
import { UpupUploader } from '../index'
import {
    baseUploaderArgs,
    restrictedUploaderArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader',
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

const testFile = (name: string, size: number, type: string) =>
    new File([new Uint8Array(size).fill(120)], name, { type })

const selectFile = async (
    canvas: ReturnType<typeof within>,
    file: File,
) => {
    const [fileInput] = canvas.getAllByTestId('upup-file-input')
    await fireEvent.change(fileInput, {
        target: { files: [file] },
    })
}

export const Basic: Story = {
    args: baseUploaderArgs,
}

export const Restrictions: Story = {
    args: restrictedUploaderArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)

        await selectFile(
            canvas,
            testFile('storybook-invalid.txt', 2048, 'text/plain'),
        )
        await waitFor(() =>
            expect(canvas.queryByTestId('upup-file-item')).toBeNull(),
        )

        await selectFile(
            canvas,
            testFile('storybook-too-large.png', 60 * 1024, 'image/png'),
        )
        await waitFor(() =>
            expect(canvas.queryByTestId('upup-file-item')).toBeNull(),
        )

        await selectFile(
            canvas,
            testFile('storybook-too-small.png', 128, 'image/png'),
        )
        await waitFor(() =>
            expect(canvas.queryByTestId('upup-file-item')).toBeNull(),
        )

        await selectFile(
            canvas,
            testFile('storybook-valid.png', 2048, 'image/png'),
        )
        await waitFor(() =>
            expect(canvas.getAllByTestId('upup-file-item')).toHaveLength(1),
        )
        expect(canvas.getByText('storybook-valid.png')).toBeVisible()
    },
}
