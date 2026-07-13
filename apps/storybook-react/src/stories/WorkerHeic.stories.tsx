import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@useupup/react'
import {
    uploaderArgTypes,
    uploaderDefaultArgs,
    workerHeicArgs,
    workerHeicPlays,
} from '@useupup/storybook-config'

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
    title: 'React/WorkerHeic',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    render,
    parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UploaderProps>

export const HeicConversion: Story = {
    args: workerHeicArgs.heicConversion,
    play: workerHeicPlays.heicConversion,
}
export const WebWorkerOffload: Story = {
    args: workerHeicArgs.webWorkerOffload,
    play: workerHeicPlays.webWorkerOffload,
}
export const MainThreadFallback: Story = {
    args: workerHeicArgs.mainThreadFallback,
    play: workerHeicPlays.mainThreadFallback,
}
