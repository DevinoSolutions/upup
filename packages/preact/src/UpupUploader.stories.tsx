import type { Meta, StoryObj } from '@storybook/preact-vite'
import { FileSource, UpupUploader } from './index'

const meta: Meta<typeof UpupUploader> = {
  title: 'Preact/UpupUploader',
  component: UpupUploader,
  args: {
    uploadEndpoint: '/storybook/upup/presign/success',
    sources: [FileSource.LOCAL, FileSource.URL],
    enablePaste: true,
    maxFiles: 3,
  },
}

export default meta

type Story = StoryObj<typeof meta>

export const Basic: Story = {}

export const Dark: Story = {
  args: {
    theme: 'dark',
  },
}

