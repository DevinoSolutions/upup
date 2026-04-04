import { useEffect, useRef, useState } from 'react'
import { UpupUploader, type UpupUploaderRef, type UploadSource } from '@upup/react'

const ALL_SOURCES: UploadSource[] = [
  'local',
  'camera',
  'url',
  'google_drive',
  'onedrive',
  'dropbox',
  'microphone',
  'screen',
]

export default function AllSources() {
  const uploaderRef = useRef<UpupUploaderRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleSources, setVisibleSources] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current) return

      // Look for source-related buttons/tabs rendered inside the uploader
      const buttons = containerRef.current.querySelectorAll(
        'button, [role="tab"], [data-source], [data-upup-slot="source"]'
      )
      const found: string[] = []
      buttons.forEach(btn => {
        const source = btn.getAttribute('data-source') || btn.textContent?.trim() || ''
        if (source) found.push(source)
      })

      setVisibleSources(found)
      setChecked(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div data-testid="sources-root">
      <h1 data-testid="sources-title">All Sources</h1>

      <div data-testid="sources-config">
        <h2 data-testid="sources-config-title">Configured Sources</h2>
        <ul data-testid="sources-config-list">
          {ALL_SOURCES.map(source => (
            <li key={source} data-testid={`sources-config-${source}`}>
              {source}
            </li>
          ))}
        </ul>
        <p data-testid="sources-config-count">
          Total configured: {ALL_SOURCES.length}
        </p>
      </div>

      <div data-testid="sources-uploader-container" ref={containerRef}>
        <UpupUploader
          ref={uploaderRef}
          sources={ALL_SOURCES}
          driveConfigs={{
            googleDrive: {
              google_client_id: '716672485589-j2junjhv8ui7hmjhgb1sv3l2n0vs5lr5.apps.googleusercontent.com',
              google_api_key: 'AIzaSyACzUpBfc3l1khFfAdumBtoMKp8NAr7hhY',
              google_app_id: 'oauthappupup',
            },
            oneDrive: {
              onedrive_client_id: '99ee7f72-91bf-44b9-925d-091c18b83269',
            },
            dropbox: {
              dropbox_client_id: '8oqtlukxuuatirk',
            },
          }}
          uploadEndpoint="/api/upload"
        />
      </div>

      <div data-testid="sources-detection">
        <h2 data-testid="sources-detection-title">Detected Visible Sources</h2>
        <p data-testid="sources-detection-status">
          Detection: {checked ? 'complete' : 'pending'}
        </p>
        <ul data-testid="sources-detection-list">
          {visibleSources.map((source, i) => (
            <li key={i} data-testid={`sources-detected-${i}`}>
              {source}
            </li>
          ))}
        </ul>
        <p data-testid="sources-detection-count">
          Visible elements: {visibleSources.length}
        </p>
        <p data-testid="sources-note">
          Note: Cloud drives (google_drive, onedrive, dropbox) will not authenticate without credentials. UI rendering is the test.
        </p>
      </div>
    </div>
  )
}
