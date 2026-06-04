import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fireEvent, waitFor, within } from 'storybook/test'
import { UpupUploader } from '../index'
import {
    baseUploaderArgs,
    restrictedUploaderArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta = {
    title: 'Uploader',
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

const testFile = (name: string, size: number, type: string) =>
    new File([new Uint8Array(size).fill(120)], name, { type })

const selectFile = async (
    canvas: ReturnType<typeof within>,
    file: File,
) => {
    const fileInputs = canvas.getAllByTestId('upup-file-input')
    const fileInput = fileInputs[fileInputs.length - 1]
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
