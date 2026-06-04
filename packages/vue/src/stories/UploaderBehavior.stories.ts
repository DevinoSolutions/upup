import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'
import { UpupUploader } from '../index'
import {
    autoUploadArgs,
    baseUploaderArgs,
    dragDropDisabledArgs,
    folderUploadArgs,
    localOnlyArgs,
    miniUploaderArgs,
    pasteUploadArgs,
    uploaderCanvasStyle,
} from './uploaderStoryArgs'

const meta = {
    title: 'Uploader/Behavior',
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

const textFile = (name: string) =>
    new File([new Uint8Array(2048).fill(120)], name, {
        type: 'text/plain',
    })

const dataTransferWithFile = (file: File) => {
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    return dataTransfer
}

const selectFiles = async (
    canvas: ReturnType<typeof within>,
    files: File[],
) => {
    const fileInputs = canvas.getAllByTestId('upup-file-input')
    const fileInput = fileInputs[fileInputs.length - 1]
    await fireEvent.change(fileInput, {
        target: { files },
    })
}

const dropFile = async (dropzone: HTMLElement, file: File) => {
    const dataTransfer = dataTransferWithFile(file)
    await fireEvent.dragOver(dropzone, { dataTransfer })
    await fireEvent.drop(dropzone, { dataTransfer })
}

const pasteFile = async (dropzone: HTMLElement, file: File) => {
    const dataTransfer = dataTransferWithFile(file)
    await fireEvent(
        dropzone,
        new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer,
        }),
    )
}

export const LocalOnly: Story = {
    args: localOnlyArgs,
}

export const AutoUpload: Story = {
    args: autoUploadArgs,
}

export const Mini: Story = {
    args: miniUploaderArgs,
}

export const PasteUpload: Story = {
    args: pasteUploadArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await pasteFile(
            canvas.getByTestId('upup-dropzone'),
            textFile('storybook-pasted.txt'),
        )
        await expect(await canvas.findByText('storybook-pasted.txt')).toBeVisible()
    },
}

export const FolderUpload: Story = {
    args: folderUploadArgs,
}

export const DragDrop: Story = {
    args: baseUploaderArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        const dropzone = canvas.getByTestId('upup-dropzone')
        const dataTransfer = dataTransferWithFile(textFile('storybook-dropped.txt'))

        await fireEvent.dragOver(dropzone, { dataTransfer })
        await waitFor(() =>
            expect(dropzone).toHaveAttribute('aria-dropeffect', 'copy'),
        )
        await fireEvent.drop(dropzone, { dataTransfer })

        await expect(await canvas.findByText('storybook-dropped.txt')).toBeVisible()
        await waitFor(() =>
            expect(dropzone).toHaveAttribute('aria-dropeffect', 'none'),
        )
    },
}

export const DragDropDisabled: Story = {
    args: dragDropDisabledArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await dropFile(
            canvas.getByTestId('upup-dropzone'),
            textFile('storybook-disabled-drop.txt'),
        )

        expect(canvas.queryByText('storybook-disabled-drop.txt')).toBeNull()

        await selectFiles(canvas, [textFile('storybook-disabled-browse.txt')])
        await expect(
            await canvas.findByText('storybook-disabled-browse.txt'),
        ).toBeVisible()
    },
}

export const MultipleFiles: Story = {
    args: baseUploaderArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await selectFiles(canvas, [
            textFile('storybook-alpha.txt'),
            textFile('storybook-beta.txt'),
            textFile('storybook-gamma.txt'),
        ])

        await waitFor(() =>
            expect(canvas.getAllByTestId('upup-file-item')).toHaveLength(3),
        )
        expect(canvas.getByText('storybook-alpha.txt')).toBeVisible()
        expect(canvas.getByText('storybook-beta.txt')).toBeVisible()
        expect(canvas.getByText('storybook-gamma.txt')).toBeVisible()

        await userEvent.click(canvas.getAllByTestId('upup-file-remove')[0])
        await waitFor(() =>
            expect(canvas.getAllByTestId('upup-file-item')).toHaveLength(2),
        )
        expect(canvas.queryByText('storybook-alpha.txt')).toBeNull()
        expect(canvas.getByText('storybook-beta.txt')).toBeVisible()
        expect(canvas.getByText('storybook-gamma.txt')).toBeVisible()
    },
}
