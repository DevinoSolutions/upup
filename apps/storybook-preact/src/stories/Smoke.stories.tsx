import type { Meta, StoryObj } from '@storybook/preact-vite'
import { UpupUploader } from '@upup/preact'

const meta: Meta<any> = {
  title: 'Smoke/Uploader',
  component: UpupUploader as any,
}
export default meta

type Story = StoryObj<any>

export const Default: Story = {
  render: () => <UpupUploader />,
}
