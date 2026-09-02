import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@useupup/react'
import { frFR, arSA, jaJP } from '@useupup/core'
import {
    uploaderArgTypes,
    uploaderDefaultArgs,
} from '@useupup/storybook-config'

const meta: Meta<UploaderProps> = {
    title: 'React/i18n',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: uploaderDefaultArgs,
    parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UploaderProps>

export const French: Story = { args: { i18n: { locale: frFR } } }
export const ArabicRTL: Story = { args: { i18n: { locale: arSA } } }
export const Japanese: Story = { args: { i18n: { locale: jaJP } } }
