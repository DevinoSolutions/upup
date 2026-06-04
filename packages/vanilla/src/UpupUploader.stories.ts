import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { defineUpupElement } from './index'

defineUpupElement()

const meta: Meta = {
  title: 'Vanilla/UpupUploader',
}

export default meta

type Story = StoryObj

export const Basic: Story = {
  render: () => {
    const uploader = document.createElement('upup-uploader')
    uploader.setAttribute('upload-endpoint', '/storybook/upup/presign/success')
    uploader.setAttribute('sources', 'local,url')
    uploader.setAttribute('enable-paste', '')
    uploader.setAttribute('max-files', '3')
    return uploader
  },
}

export const Dark: Story = {
  render: () => {
    const uploader = document.createElement('upup-uploader')
    uploader.setAttribute('upload-endpoint', '/storybook/upup/presign/success')
    uploader.setAttribute('sources', 'local,url')
    uploader.setAttribute('enable-paste', '')
    uploader.setAttribute('theme', 'dark')
    return uploader
  },
}
