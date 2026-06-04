import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UpupUploaderProps } from '@upup/react'
import { frFR, arSA, jaJP } from '@upup/core'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upup/storybook-config'

const meta: Meta<UpupUploaderProps> = {
  title: 'React/i18n',
  component: UpupUploader,
  argTypes: uploaderArgTypes,
  args: uploaderDefaultArgs,
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UpupUploaderProps>

export const French: Story = { args: { i18n: { locale: frFR } } }
export const ArabicRTL: Story = { args: { i18n: { locale: arSA } } }
export const Japanese: Story = { args: { i18n: { locale: jaJP } } }
