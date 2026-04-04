import { useRef, useState, useCallback, useEffect } from 'react'
import { UpupUploader, type UpupUploaderRef } from '@upup/react'

interface EventEntry {
  id: number
  time: string
  event: string
  detail: string
}

let eventId = 0

export default function BasicUploaderPage() {
  const uploaderRef = useRef<UpupUploaderRef>(null)
  const [mini, setMini] = useState(false)
  const [events, setEvents] = useState<EventEntry[]>([])

  const logEvent = useCallback((event: string, detail?: unknown) => {
    setEvents(prev => [
      {
        id: ++eventId,
        time: new Date().toISOString().slice(11, 23),
        event,
        detail: detail ? JSON.stringify(detail) : '',
      },
      ...prev.slice(0, 49),
    ])
  }, [])

  // Subscribe to core events via the ref once the uploader is mounted
  useEffect(() => {
    const hook = uploaderRef.current?.useUpload?.()
    if (!hook) return
    const unsubs: (() => void)[] = []
    unsubs.push(hook.on('files-added', (...args: unknown[]) => {
      logEvent('files-added', { args })
    }))
    unsubs.push(hook.on('upload-all-complete', (...args: unknown[]) => {
      logEvent('upload-complete', { args })
    }))
    return () => unsubs.forEach(u => u())
  }, [logEvent])

  // Derive status info from ref when available
  const hook = uploaderRef.current?.useUpload?.()
  const fileCount = hook?.files?.length ?? 0
  const status = hook?.status ?? 'IDLE'
  const progress = hook?.progress?.percentage ?? 0

  return (
    <div data-testid="basic-page">
      <h1 data-testid="basic-title">Basic UpupUploader</h1>

      <div data-testid="basic-controls" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          data-testid="basic-toggle-mini"
          onClick={() => setMini(m => !m)}
        >
          {mini ? 'Switch to Full' : 'Switch to Mini'}
        </button>
      </div>

      <div data-testid="basic-status-bar" style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <span data-testid="basic-file-count">Files: {fileCount}</span>
        <span data-testid="basic-status">Status: {status}</span>
        <span data-testid="basic-progress">Progress: {progress}%</span>
        <span data-testid="basic-mini-state">Mini: {mini ? 'on' : 'off'}</span>
      </div>

      <div data-testid="basic-uploader-wrapper" style={{ marginBottom: 16 }}>
        <UpupUploader
          ref={uploaderRef}
          sources={['local']}
          mini={mini}
          uploadEndpoint="/api/upload"
        />
      </div>

      <div data-testid="basic-event-log">
        <h3 data-testid="basic-event-log-title">Event Log ({events.length})</h3>
        <div
          data-testid="basic-event-log-list"
          style={{
            maxHeight: 200,
            overflow: 'auto',
            border: '1px solid #ddd',
            borderRadius: 4,
            padding: 8,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        >
          {events.length === 0 && (
            <div data-testid="basic-event-log-empty">No events yet</div>
          )}
          {events.map(e => (
            <div key={e.id} data-testid={`basic-event-${e.id}`}>
              <span data-testid={`basic-event-time-${e.id}`}>[{e.time}]</span>{' '}
              <span data-testid={`basic-event-name-${e.id}`}>{e.event}</span>{' '}
              <span data-testid={`basic-event-detail-${e.id}`}>{e.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
