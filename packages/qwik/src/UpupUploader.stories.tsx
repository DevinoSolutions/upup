import { FileSource, UpupUploader } from './index'

const meta = {
  title: 'Qwik/UpupUploader',
  component: UpupUploader,
  args: {
    uploadEndpoint: '/storybook/upup/presign/success',
    sources: [FileSource.LOCAL, FileSource.URL],
    enablePaste: true,
    maxFiles: 3,
  },
}

export default meta

export const Basic = {}

export const Dark = {
  args: {
    theme: 'dark',
  },
}

