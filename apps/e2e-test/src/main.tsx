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

function App() {
  const [showHeadless, setShowHeadless] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a', padding: 40, gap: 24 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setShowHeadless(false)} style={{ padding: '8px 16px', background: !showHeadless ? '#30C5F7' : '#333', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Full UI Component
        </button>
        <button onClick={() => setShowHeadless(true)} style={{ padding: '8px 16px', background: showHeadless ? '#30C5F7' : '#333', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Headless Hook
        </button>
      </div>

      {showHeadless ? (
        <HeadlessDemo />
      ) : (
        <UpupUploader
          provider="BackBlaze"
          maxFiles={99}
          uploadEndpoint="/api/upload"
          sources={['local', 'google_drive', 'onedrive', 'url', 'camera', 'microphone', 'screen']}
          theme={{ mode: 'dark' }}
          maxFileSize={{ size: 999, unit: 'MB' }}
          driveConfigs={{
            googleDrive: {
              google_client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
              google_api_key: import.meta.env.VITE_GOOGLE_API_KEY || '',
              google_app_id: import.meta.env.VITE_GOOGLE_APP_ID || '',
            },
            oneDrive: { onedrive_client_id: import.meta.env.VITE_ONEDRIVE_CLIENT_ID || '' },
          }}
        />
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
