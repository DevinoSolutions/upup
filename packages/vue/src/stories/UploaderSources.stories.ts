import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { FileSource } from '@upup/core'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { UpupUploader } from '../index'
import {
    allSourcesArgs,
    baseUploaderArgs,
    clientCloudAuthArgs,
    serverGoogleDriveArgs,
    uploaderCanvasStyle,
    urlSourceArgs,
} from './uploaderStoryArgs'

const meta = {
    title: 'Uploader/Sources',
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

const urlFailureArgs = {
    ...urlSourceArgs,
    onError: (message: string) => {
        window.dispatchEvent(
            new CustomEvent('upup-storybook:url-error', {
                detail: message,
            }),
        )
    },
}

const waitForUrlError = () =>
    new Promise<string>(resolve => {
        window.addEventListener(
            'upup-storybook:url-error',
            event => resolve((event as CustomEvent<string>).detail),
            { once: true },
        )
    })

export const Local: Story = {
    args: {
        ...baseUploaderArgs,
        sources: [FileSource.LOCAL],
    },
}

export const URL: Story = {
    args: urlSourceArgs,
}

export const URLCancel: Story = {
    args: urlSourceArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('upup-source-url'))
        await expect(canvas.getByPlaceholderText(/enter file url/i)).toBeVisible()
        await userEvent.click(canvas.getByRole('button', { name: /cancel/i }))
        await waitFor(() =>
            expect(canvas.queryByPlaceholderText(/enter file url/i)).toBeNull(),
        )
        await expect(canvas.getByTestId('upup-source-url')).toBeVisible()
    },
}

export const URLFetchSuccess: Story = {
    args: urlSourceArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('upup-source-url'))
        await userEvent.type(
            canvas.getByPlaceholderText(/enter file url/i),
            '/storybook/upup/object/sample.txt',
        )
        await userEvent.click(canvas.getByRole('button', { name: /fetch/i }))
        await expect(await canvas.findByText('sample.txt')).toBeVisible()
    },
}

export const URLFetchFailure: Story = {
    args: urlFailureArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        const urlError = waitForUrlError()

        await userEvent.click(canvas.getByTestId('upup-source-url'))
        await userEvent.type(
            canvas.getByPlaceholderText(/enter file url/i),
            '/storybook/upup/object/missing.txt',
        )
        await userEvent.click(canvas.getByRole('button', { name: /fetch/i }))

        expect(await urlError).toContain('Failed to fetch URL: 404')
        await expect(canvas.getByPlaceholderText(/enter file url/i)).toBeVisible()
        expect(canvas.queryByTestId('upup-file-item')).toBeNull()
    },
}

export const Camera: Story = {
    args: {
        ...baseUploaderArgs,
        sources: [FileSource.CAMERA],
    },
}

export const AllServerSources: Story = {
    args: allSourcesArgs,
}

export const ClientCloudAuthFallbacks: Story = {
    args: clientCloudAuthArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        const providers = [
            ['upup-source-googleDrive', 'Google Drive'],
            ['upup-source-oneDrive', 'OneDrive'],
            ['upup-source-dropbox', 'Dropbox'],
            ['upup-source-box', 'Box'],
        ] as const

        for (const [testId, provider] of providers) {
            await userEvent.click(canvas.getByTestId(testId))
            await expect(
                await canvas.findByRole('button', {
                    name: new RegExp(`sign in with ${provider}`, 'i'),
                }),
            ).toBeVisible()
            await userEvent.click(canvas.getByRole('button', { name: /cancel/i }))
            await waitFor(() =>
                expect(
                    canvas.queryByRole('button', {
                        name: new RegExp(`sign in with ${provider}`, 'i'),
                    }),
                ).toBeNull(),
            )
        }
    },
}

export const ServerGoogleDrive: Story = {
    args: serverGoogleDriveArgs,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        await userEvent.click(canvas.getByTestId('upup-source-googleDrive'))
        await expect(
            await canvas.findByText('quarterly-report.pdf'),
        ).toBeVisible()
    },
}
