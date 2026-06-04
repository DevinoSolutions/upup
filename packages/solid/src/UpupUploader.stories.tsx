import type { Meta } from 'storybook-solidjs-vite'
import { FileSource, UpupUploader } from './index'

const meta: Meta<typeof UpupUploader> = {
  title: 'Solid/UpupUploader',
  component: UpupUploader,
  args: {
    uploadEndpoint: '/storybook/upup/presign/success',
    sources: [FileSource.LOCAL, FileSource.URL],
    enablePaste: true,
    maxFiles: 3,
  },
}

export default meta

export const Basic = () => (
  <UpupUploader
    uploadEndpoint="/storybook/upup/presign/success"
    sources={[FileSource.LOCAL, FileSource.URL]}
    enablePaste
    maxFiles={3}
  />
)

export const Dark = () => (
  <UpupUploader
    uploadEndpoint="/storybook/upup/presign/success"
    sources={[FileSource.LOCAL, FileSource.URL]}
    enablePaste
    maxFiles={3}
    theme="dark"
  />
)
