import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@upupjs/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upupjs/storybook-config'

const meta: Meta<UploaderProps> = {
    title: 'React/Resumable',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: { ...uploaderDefaultArgs, autoUpload: true },
    parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<UploaderProps>

export const Multipart: Story = {
    args: { resumable: { protocol: 'multipart' } },
}
