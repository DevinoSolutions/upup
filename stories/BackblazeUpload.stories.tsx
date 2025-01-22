import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import UpupUploader from '../src/frontend/UpupUploader'
import { UpupProvider } from '../src/shared/types'

const meta = {
    title: 'Cloud Storage/Local to Backblaze Upload',
    component: UpupUploader,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Upload local files directly to Backblaze B2 storage.',
            },
        },
    },
} satisfies Meta<typeof UpupUploader>

export default meta
type Story = StoryObj<typeof UpupUploader>

const BackblazeUploader = () => (
    <UpupUploader
        provider={UpupProvider.BackBlaze}
        tokenEndpoint="http://localhost:3001/api/storage/backblaze/upload-url"
        accept="*"
        maxFileSize={{ size: 10, unit: 'MB' }}
    />
)

export const Default: Story = {
    render: () => <BackblazeUploader />,
}
