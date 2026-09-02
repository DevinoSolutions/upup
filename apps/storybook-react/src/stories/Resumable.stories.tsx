import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@useupup/react'
import {
    uploaderArgTypes,
    uploaderDefaultArgs,
} from '@useupup/storybook-config'

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
