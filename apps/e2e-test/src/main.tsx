import React from 'react'
import ReactDOM from 'react-dom/client'
import './upup.css'
import { UpupUploader } from '@upup/react'

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a', padding: 40 }}>
      <UpupUploader
        provider="BackBlaze"
        limit={99}
        uploadEndpoint="/api/upload"
        uploadAdapters={['INTERNAL', 'GOOGLE_DRIVE', 'ONE_DRIVE', 'LINK', 'CAMERA']}
        dark={true}
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
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
