import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@upup/react'
import {
    uploaderArgTypes,
    uploaderDefaultArgs,
    uploadErrorHandlers,
    stateStoryArgs,
    stateStoryPlays,
} from '@upup/storybook-config'

function render(args: Record<string, unknown>) {
    const { themeMode, primaryColor, ...rest } = args
    const theme = {
        ...(themeMode ? { mode: themeMode } : {}),
        ...(primaryColor
            ? { tokens: { color: { primary: primaryColor } } }
            : {}),
    }
    const props = { ...rest, ...(Object.keys(theme).length ? { theme } : {}) }
    return <UpupUploader {...(props as UploaderProps)} />
}

const meta: Meta<UploaderProps> = {
    title: 'React/States',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    render,
    parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UploaderProps>

// Feeds a PNG through the default success handlers → data-state="successful".
export const UploadSuccess: Story = {
    args: stateStoryArgs.uploadSuccess,
    play: stateStoryPlays.uploadSuccess,
}

// Object PUT 500s → data-state="failed" + the upload-error slot renders.
export const UploadError: Story = {
    args: stateStoryArgs.uploadError,
    parameters: { msw: { handlers: uploadErrorHandlers } },
    play: stateStoryPlays.uploadError,
}

// PNG against allowedFileTypes:'application/pdf' → rejected (onError, no tile).
export const RestrictedFileRejected: Story = {
    args: stateStoryArgs.restrictedFileRejected,
    play: stateStoryPlays.restrictedFileRejected,
}
