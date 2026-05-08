import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import './upup.css'
import { UpupUploader, useUpupUpload } from '@upup/react'

/** Headless hook demo — v2 feature, custom UI built from scratch */
function HeadlessDemo() {
  const { files, status, progress, addFiles, removeFile, upload, core } = useUpupUpload({
    uploadEndpoint: '/api/upload',
    maxConcurrentUploads: 3,
  })

  return (
    <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, minWidth: 300, color: '#fff' }}>
      <h3 style={{ margin: '0 0 12px', color: '#30C5F7' }}>Headless Hook Demo</h3>
      <input type="file" multiple onChange={e => e.target.files && addFiles(Array.from(e.target.files))} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>
        Status: {status} | Files: {files.length} | Progress: {progress.percentage}%
      </div>
      {files.map(f => (
        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
          <span>{f.name}</span>
          <button onClick={() => removeFile(f.id)} style={{ color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
        </div>
      ))}
      {files.length > 0 && (
        <button onClick={() => upload()} style={{ marginTop: 8, padding: '6px 16px', background: '#30C5F7', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Upload {files.length} file{files.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

/** Restrictions scenario — loaded via /?scenario=restrictions */
function RestrictionsDemo() {
  return (
    <UpupUploader
      uploadEndpoint="/api/upload"
      accept="image/*"
      maxFiles={2}
      maxFileSize={{ size: 50, unit: 'KB' }}
      minFileSize={{ size: 1, unit: 'KB' }}
      onRestrictionFailed={(file, reason) => console.log('Rejected:', file.name, reason)}
    />
  )
}

function App() {
  const scenario = new URLSearchParams(window.location.search).get('scenario')
  const [tab, setTab] = useState<'dark' | 'light' | 'headless'>('dark')

  const tabStyle = (t: string) => ({
    padding: '8px 16px',
    background: tab === t ? '#30C5F7' : '#333',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer' as const,
  })

  if (scenario === 'restrictions') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a', padding: 40 }}>
        <RestrictionsDemo />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a', padding: 40, gap: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('dark')} style={tabStyle('dark')}>Dark Mode</button>
        <button onClick={() => setTab('light')} style={tabStyle('light')}>Light Mode</button>
        <button onClick={() => setTab('headless')} style={tabStyle('headless')}>Headless Hook</button>
      </div>

      {tab === 'headless' ? (
        <HeadlessDemo />
      ) : (
        <UpupUploader
          provider="backblaze"
          maxFiles={99}
          uploadEndpoint="/api/upload"
          sources={['local', 'googleDrive', 'oneDrive', 'dropbox', 'url', 'camera', 'microphone', 'screen']}
          theme={{ mode: tab }}
          maxFileSize={{ size: 999, unit: 'MB' }}
          minFileSize={{ size: 1, unit: 'KB' }}
          thumbnailGenerator={false}
          enablePaste
          onRestrictionFailed={(file, reason) => console.log('Rejected:', file.name, reason)}
          onFilesUploadComplete={(files) => console.log('Upload complete:', files.length, 'files')}
          cloudDrives={{
            googleDrive: {
              clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
              apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
              appId: import.meta.env.VITE_GOOGLE_APP_ID || '',
            },
            oneDrive: { clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID || '' },
            dropbox: { clientId: import.meta.env.VITE_DROPBOX_CLIENT_ID || '' },
          }}
        />
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
