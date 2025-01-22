import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import UpupUploader from '../src/frontend/UpupUploader'
import { UpupProvider } from '../src/shared/types'

const meta = {
    title: 'Cloud Storage/Local to DigitalOcean Upload',
    component: UpupUploader,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Upload local files directly to DigitalOcean Spaces.',
            },
        },
    },
} satisfies Meta<typeof UpupUploader>

export default meta
type Story = StoryObj<typeof UpupUploader>

const LocalUploader = () => (
    <UpupUploader
        provider={UpupProvider.DigitalOcean}
        tokenEndpoint="http://localhost:3001/api/storage/digitalocean/upload-url"
        accept="*"
        maxFileSize={{ size: 10, unit: 'MB' }}
    />
)

export const Default: Story = {
    render: () => <LocalUploader />,
}
