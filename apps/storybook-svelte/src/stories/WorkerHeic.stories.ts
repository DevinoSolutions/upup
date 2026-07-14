import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { UpupUploader } from '@upupjs/svelte'
import {
    uploaderArgTypes,
    uploaderDefaultArgs,
    workerHeicArgs,
    workerHeicPlays,
} from '@upupjs/storybook-config'

function buildProps(args: Record<string, unknown>) {
    const { themeMode, primaryColor, ...rest } = args
    const theme = {
        ...(themeMode ? { mode: themeMode } : {}),
        ...(primaryColor
            ? { tokens: { color: { primary: primaryColor } } }
            : {}),
    }
    return { ...rest, ...(Object.keys(theme).length ? { theme } : {}) }
}

const meta: Meta<typeof UpupUploader> = {
    title: 'Svelte/WorkerHeic',
    component: UpupUploader as unknown as Meta<
        typeof UpupUploader
    >['component'],
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: args => ({
        Component: UpupUploader,
        props: buildProps(args as Record<string, unknown>) as any,
    }),
    parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof UpupUploader>

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
