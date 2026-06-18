import { UpupUploader } from '@upup/next'

export default function PagesRouterDemo() {
  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>@upup/next — Pages Router</h1>
      <p>
        Server-mode uploader talking to the Pages Router handler at{' '}
        <code>/api/upup-pages</code>.
      </p>
      <UpupUploader
        mode="server"
        serverUrl="/api/upup-pages"
        onError={(e) => console.error('[upup] error', e)}
        onFilesUploadComplete={(files) => console.log('[upup] complete', files)}
      />
    </main>
  )
}
