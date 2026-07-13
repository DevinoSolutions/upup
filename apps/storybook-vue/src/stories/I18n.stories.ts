import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UpupUploader } from '@useupup/vue'
import { frFR, arSA, jaJP } from '@useupup/core'
import {
    uploaderArgTypes,
    uploaderDefaultArgs,
} from '@useupup/storybook-config'

const meta: Meta<typeof UpupUploader> = {
    title: 'Vue/i18n',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    render: args => ({
        components: { UpupUploader },
        setup: () => ({ args }),
        template: '<UpupUploader v-bind="args" />',
    }),
    parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof UpupUploader>

export const French: Story = { args: { i18n: { locale: frFR } } }
export const ArabicRTL: Story = { args: { i18n: { locale: arSA } } }
export const Japanese: Story = { args: { i18n: { locale: jaJP } } }
