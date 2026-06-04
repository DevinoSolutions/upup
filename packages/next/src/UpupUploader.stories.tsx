import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FileSource, UpupUploader } from './client'

const meta: Meta<typeof UpupUploader> = {
  title: 'Next/UpupUploader',
  component: UpupUploader,
  args: {
    uploadEndpoint: '/storybook/upup/presign/success',
    sources: [FileSource.LOCAL, FileSource.URL],
    enablePaste: true,
    maxFiles: 3,
  },
}

export default meta

type Story = StoryObj<typeof UpupUploader>

export const Basic: Story = {}

export const Dark: Story = {
  args: {
    theme: { mode: 'dark' },
  },
}
