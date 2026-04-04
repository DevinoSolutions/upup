import { useRef, useState, useEffect, useCallback } from 'react'
import { useUpupUpload } from '@upup/react'
import { UploadStatus } from '@upup/shared'

interface EventEntry {
  id: number
  time: string
  event: string
  detail: string
}

let eventId = 0

export default function HeadlessHookPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const {
    files,
    status,
    progress,
    error,
    addFiles,
    removeFile,
    removeAll,
    reorderFiles,
    upload,
    pause,
    resume,
    cancel,
    retry,
    on,
    ext,
    core,
    getDropzoneProps,
    getRootProps,
    getInputProps,
  } = useUpupUpload({
    restrictions: {
      maxFileCount: 10,
      maxFileSize: 50 * 1024 * 1024, // 50 MB
    },
  })

  // Subscribe to events
  useEffect(() => {
    const unsubs = [
      on('files-added', (...args: unknown[]) => logEvent('files-added', args)),
      on('file-removed', (...args: unknown[]) => logEvent('file-removed', args)),
      on('upload-start', (...args: unknown[]) => logEvent('upload-start', args)),
      on('upload-progress', (...args: unknown[]) => logEvent('upload-progress', args)),
      on('upload-complete', (...args: unknown[]) => logEvent('upload-complete', args)),
      on('upload-error', (...args: unknown[]) => logEvent('upload-error', args)),
      on('state-change', () => logEvent('state-change')),
    ]
    return () => unsubs.forEach(u => u())
  }, [on, logEvent])

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files
    if (inputFiles && inputFiles.length > 0) {
      await addFiles(Array.from(inputFiles))
    }
    // Reset so re-selecting the same file triggers change
    e.target.value = ''
  }

  const handleReverse = () => {
    const ids = files.map(f => f.id).reverse()
    reorderFiles(ids)
  }

  return (
    <div data-testid="headless-page">
      <h1 data-testid="headless-title">Headless useUpupUpload</h1>

      {/* File input */}
      <div data-testid="headless-input-section" style={{ marginBottom: 16 }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          data-testid="headless-file-input"
          onChange={handleFileInput}
        />
      </div>

      {/* Action buttons */}
      <div data-testid="headless-actions" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button data-testid="headless-btn-upload" onClick={() => upload()}>
          Upload
        </button>
        <button data-testid="headless-btn-pause" onClick={pause}>
          Pause
        </button>
        <button data-testid="headless-btn-resume" onClick={resume}>
          Resume
        </button>
        <button data-testid="headless-btn-cancel" onClick={cancel}>
          Cancel
        </button>
        <button data-testid="headless-btn-retry" onClick={() => retry()}>
          Retry All
        </button>
        <button data-testid="headless-btn-remove-all" onClick={removeAll}>
          Remove All
        </button>
        <button data-testid="headless-btn-reverse" onClick={handleReverse}>
          Reverse Order
        </button>
      </div>

      {/* Status display */}
      <div data-testid="headless-status-section" style={{ marginBottom: 16 }}>
        <div data-testid="headless-status">Status: {status}</div>
        <div data-testid="headless-progress">
          Progress: {progress.percentage}% ({progress.completedFiles}/{progress.totalFiles})
        </div>
        <div data-testid="headless-error">
          Error: {error ? `${error.message}` : 'none'}
        </div>
        <div data-testid="headless-file-count">Files: {files.length}</div>
      </div>

      {/* Files list */}
      <div data-testid="headless-files-section" style={{ marginBottom: 16 }}>
        <h3 data-testid="headless-files-title">Files</h3>
        {files.length === 0 && <div data-testid="headless-files-empty">No files</div>}
        <ul data-testid="headless-files-list" style={{ listStyle: 'none', padding: 0 }}>
          {files.map((f, i) => (
            <li
              key={f.id}
              data-testid={`headless-file-item-${i}`}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                padding: '4px 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <span data-testid={`headless-file-name-${i}`}>{f.name}</span>
              <span data-testid={`headless-file-size-${i}`}>{f.size}b</span>
              <span data-testid={`headless-file-status-${i}`}>{f.status}</span>
              <button
                data-testid={`headless-file-remove-${i}`}
                onClick={() => removeFile(f.id)}
              >
                Remove
              </button>
              <button
                data-testid={`headless-file-retry-${i}`}
                onClick={() => retry(f.id)}
              >
                Retry
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Extensions */}
      <div data-testid="headless-ext-section" style={{ marginBottom: 16 }}>
        <h3 data-testid="headless-ext-title">Extensions (ext)</h3>
        <pre data-testid="headless-ext-keys">
          {JSON.stringify(Object.keys(ext), null, 2)}
        </pre>
      </div>

      {/* Core options */}
      <div data-testid="headless-core-section" style={{ marginBottom: 16 }}>
        <h3 data-testid="headless-core-title">core.options</h3>
        <pre data-testid="headless-core-options" style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
          {JSON.stringify(core?.opts ?? {}, null, 2)}
        </pre>
      </div>

      {/* Prop getters verification */}
      <div data-testid="headless-prop-getters-section" style={{ marginBottom: 16 }}>
        <h3 data-testid="headless-prop-getters-title">Prop Getters</h3>
        <div data-testid="headless-has-dropzone-props">
          getDropzoneProps: {typeof getDropzoneProps === 'function' ? 'available' : 'missing'}
        </div>
        <div data-testid="headless-has-root-props">
          getRootProps: {typeof getRootProps === 'function' ? 'available' : 'missing'}
        </div>
        <div data-testid="headless-has-input-props">
          getInputProps: {typeof getInputProps === 'function' ? 'available' : 'missing'}
        </div>
      </div>

      {/* Event log */}
      <div data-testid="headless-event-log">
        <h3 data-testid="headless-event-log-title">Event Log ({events.length})</h3>
        <div
          data-testid="headless-event-log-list"
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
            <div data-testid="headless-event-log-empty">No events yet</div>
          )}
          {events.map(e => (
            <div key={e.id} data-testid={`headless-event-${e.id}`}>
              [{e.time}] {e.event} {e.detail}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
