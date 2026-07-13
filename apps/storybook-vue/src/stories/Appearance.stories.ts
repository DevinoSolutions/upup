import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader, type UploaderProps } from '@upupjs/vue'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upupjs/storybook-config'

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
    title: 'Vue/Appearance',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    render: args => ({
        components: { UpupUploader },
        setup: () => ({ props: buildProps(args as Record<string, unknown>) }),
        template: '<UpupUploader v-bind="props" />',
    }),
    parameters: { layout: 'padded' },
}
export default meta
// Appearance stories surface the two virtual controls (themeMode/primaryColor)
// directly in story args; widen the Story args type to admit them while keeping
// full type-safety on real UploaderProps.
type Story = StoryObj<
    UploaderProps & {
        themeMode?: 'light' | 'dark' | 'system'
        primaryColor?: string
    }
>

export const Mini: Story = { args: { mini: true } }
export const ForcedDark: Story = {
    args: { themeMode: 'dark' },
    globals: { theme: 'dark' },
}
export const CustomPrimary: Story = { args: { primaryColor: '#37c4f5' } }
export const RoundedCard: Story = {
    args: { className: 'max-w-2xl mx-auto rounded-2xl shadow-lg border' },
}
