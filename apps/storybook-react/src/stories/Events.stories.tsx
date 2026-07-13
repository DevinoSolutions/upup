import type { Meta, StoryObj } from '@storybook/react-vite'
import { UpupUploader, type UploaderProps } from '@upupjs/react'
import { uploaderArgTypes, uploaderDefaultArgs } from '@upupjs/storybook-config'

const meta: Meta<UploaderProps> = {
    title: 'React/Events',
    component: UpupUploader,
    argTypes: uploaderArgTypes,
    args: { ...uploaderDefaultArgs, autoUpload: true },
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Select a file; lifecycle callbacks log to the Actions panel.',
            },
        },
    },
}
export default meta
type Story = StoryObj<UploaderProps>

export const AllCallbacks: Story = {}
