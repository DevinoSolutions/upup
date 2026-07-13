import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@upupjs/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upupjs/storybook-config'

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
    title: 'React/Appearance',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    render,
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
