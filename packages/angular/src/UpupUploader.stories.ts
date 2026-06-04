import type { Meta, StoryObj } from '@storybook/angular'
import { FileSource } from '@upup/core'
import { UpupUploaderComponent } from './upup-uploader.component'

const meta: Meta<UpupUploaderComponent> = {
  title: 'Angular/UpupUploader',
  component: UpupUploaderComponent,
  args: {
    uploadEndpoint: '/storybook/upup/presign/success',
    sources: [FileSource.LOCAL, FileSource.URL],
    enablePaste: true,
    maxFiles: 3,
    theme: 'light',
  },
}

export default meta

type Story = StoryObj<UpupUploaderComponent>

export const Basic: Story = {}

export const Dark: Story = {
  args: {
    theme: 'dark',
  },
}
