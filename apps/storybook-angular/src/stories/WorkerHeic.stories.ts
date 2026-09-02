// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { Meta, StoryObj } from '@storybook/angular'
import { applicationConfig, moduleMetadata } from '@storybook/angular'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import { UpupUploaderComponent } from '@useupup/angular'
import type { UploaderProps } from '@useupup/angular'
import {
    uploaderArgTypes,
    uploaderDefaultArgs,
    workerHeicArgs,
    workerHeicPlays,
} from '@useupup/storybook-config'

function buildOptions(args: Record<string, unknown>): UploaderProps {
    const { themeMode, primaryColor, ...rest } = args
    const theme: Record<string, unknown> = {
        ...(themeMode ? { mode: themeMode } : {}),
        ...(primaryColor
            ? { tokens: { color: { primary: primaryColor } } }
            : {}),
    }
    return {
        ...(rest as UploaderProps),
        ...(Object.keys(theme).length
            ? { theme: theme as UploaderProps['theme'] }
            : {}),
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta: Meta<any> = {
    title: 'Angular/WorkerHeic',
    component: UpupUploaderComponent,
    decorators: [
        applicationConfig({ providers: [provideAnimationsAsync()] }),
        moduleMetadata({ imports: [UpupUploaderComponent] }),
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    argTypes: uploaderArgTypes as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: uploaderDefaultArgs as any,
    render: args => ({
        props: { config: buildOptions(args as Record<string, unknown>) },
        template: `<upup-uploader [config]="config" style="display:block;width:480px;height:420px"></upup-uploader>`,
    }),
    parameters: { layout: 'padded' },
}
export default meta
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>

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
