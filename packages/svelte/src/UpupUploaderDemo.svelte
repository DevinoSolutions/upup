<script lang="ts">
  import { FileSource, upupUploader, type UpupUploaderActionOptions } from './index'

  export let theme: 'light' | 'dark' = 'light'

  const options: UpupUploaderActionOptions = {
    uploadEndpoint: '/storybook/upup/presign/success',
    sources: [FileSource.LOCAL, FileSource.URL],
    enablePaste: true,
    maxFiles: 3,
    theme,
  }
</script>

<div use:upupUploader={options}></div>
