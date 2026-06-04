import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'
import { UpupUploader } from '../index'
import {
    clientUploadFailureArgs,
    clientUploadSlowArgs,
    clientUploadSuccessArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta: Meta<typeof UpupUploader> = {
    title: 'Uploader/UploadFlow',
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

const textFile = (name: string) =>
    new File([new Uint8Array(2048).fill(120)], name, {
        type: 'text/plain',
    })

const selectFile = async (
    canvas: ReturnType<typeof within>,
    file: File,
) => {
    const [fileInput] = canvas.getAllByTestId('upup-file-input')
    await fireEvent.change(fileInput, {
        target: { files: [file] },
    })
}

const uploadSelectedFile = async (
    canvas: ReturnType<typeof within>,
    fileName: string,
) => {
    await selectFile(canvas, textFile(fileName))
    await waitFor(() => expect(canvas.getByText(fileName)).toBeVisible())
    await userEvent.click(
        await canvas.findByRole('button', { name: /upload 1 file/i }),
    )
}

export const Success: Story = {
    args: clientUploadSuccessArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await uploadSelectedFile(canvas, 'storybook-success.txt')
        await waitFor(() =>
            expect(canvas.getByTestId('upup-root')).toHaveAttribute(
                'data-state',
                'successful',
            ),
        )
    },
}

export const Failure: Story = {
    args: clientUploadFailureArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await uploadSelectedFile(canvas, 'storybook-failure.txt')
        await waitFor(() =>
            expect(canvas.getByTestId('upup-root')).toHaveAttribute(
                'data-state',
                'failed',
            ),
        )
        await waitFor(() =>
            expect(canvas.getByTestId('upup-retry-btn')).toBeVisible(),
        )
    },
}

export const Progress: Story = {
    args: clientUploadSlowArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await uploadSelectedFile(canvas, 'storybook-progress.txt')
        await waitFor(() =>
            expect(canvas.getByTestId('upup-root')).toHaveAttribute(
                'data-state',
                'uploading',
            ),
        )
        await waitFor(() =>
            expect(
                canvas
                    .getAllByTestId('upup-progress-bar')
                    .some(
                        progressBar =>
                            Number(progressBar.getAttribute('aria-valuenow')) >
                            0,
                    ),
            ).toBe(true),
        )
        await waitFor(() =>
            expect(canvas.getByTestId('upup-root')).toHaveAttribute(
                'data-state',
                'successful',
            ),
        )
    },
}
