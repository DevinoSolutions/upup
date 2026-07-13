import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '@upupjs/vue'
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
    title: 'Vue/WorkerHeic',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    render: args => ({
        components: { UpupUploader },
        setup() {
            return { props: buildProps(args as Record<string, unknown>) }
        },
        template: '<UpupUploader v-bind="props" />',
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
