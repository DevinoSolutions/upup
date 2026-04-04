import { useState, useCallback } from 'react'
import { useUpupUpload } from '@upup/react'
import { UploadStatus, type UploadFile } from '@upup/shared'

type EventLogEntry = { event: string; timestamp: number; data?: unknown }

export default function UploadLifecycle() {
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([])

  const logEvent = useCallback((event: string, data?: unknown) => {
    setEventLog(prev => [...prev, { event, timestamp: Date.now(), data }])
  }, [])

  const {
    files,
    status,
    progress,
    addFiles,
    upload,
    pause,
    resume,
    cancel,
    retry,
    on,
  } = useUpupUpload({
    uploadEndpoint: '/api/upload',
    onFileAdded: (addedFiles: UploadFile[]) => {
      logEvent('onFileAdded', { count: addedFiles.length })
    },
    onUploadProgress: (prog: { fileId: string; loaded: number; total: number }) => {
      logEvent('onUploadProgress', prog)
    },
    onUploadComplete: (completedFiles: UploadFile[]) => {
      logEvent('onUploadComplete', { count: completedFiles.length })
    },
  })

  // Subscribe to core events
  useState(() => {
    const events = [
      'upload-start',
      'upload-progress',
      'upload-pause',
      'upload-resume',
      'upload-cancel',
      'upload-all-complete',
      'upload-error',
    ] as const

    for (const event of events) {
      on(event, (...args: unknown[]) => {
        logEvent(event, args[0])
      })
    }
  })

  const handleAddFiles = async () => {
    const testFiles = [
      new File(['upload test content'], 'upload-test.txt', { type: 'text/plain' }),
    ]
    await addFiles(testFiles)
  }

  const handleUpload = async () => {
    try {
      await upload()
    } catch {
      // error is captured via event log
    }
  }

  const clearLog = () => setEventLog([])

  return (
    <div data-testid="upload-root">
      <h1 data-testid="upload-title">Upload Lifecycle</h1>

      <div data-testid="upload-status-section">
        <p data-testid="upload-status">
          Status: <span data-testid="upload-status-value">{status}</span>
        </p>
        <div data-testid="upload-progress-section">
          <div
            data-testid="upload-progress-bar"
            style={{
              width: '200px',
              height: '20px',
              background: '#eee',
              border: '1px solid #ccc',
            }}
          >
            <div
              data-testid="upload-progress-fill"
              style={{
                width: `${progress.percentage}%`,
                height: '100%',
                background: '#4caf50',
                transition: 'width 0.2s',
              }}
            />
          </div>
          <span data-testid="upload-progress-percentage">{progress.percentage}%</span>
          <span data-testid="upload-progress-completed">
            {progress.completedFiles}/{progress.totalFiles}
          </span>
        </div>
      </div>

      <div data-testid="upload-controls">
        <button data-testid="upload-add-btn" onClick={handleAddFiles}>
          Add test file
        </button>
        <button data-testid="upload-upload-btn" onClick={handleUpload}>
          Upload
        </button>
        <button data-testid="upload-pause-btn" onClick={pause}>
          Pause
        </button>
        <button data-testid="upload-resume-btn" onClick={resume}>
          Resume
        </button>
        <button data-testid="upload-cancel-btn" onClick={cancel}>
          Cancel
        </button>
        <button data-testid="upload-retry-btn" onClick={() => retry()}>
          Retry
        </button>
      </div>

      <div data-testid="upload-files-section">
        <p data-testid="upload-files-count">Files: {files.length}</p>
        <ul data-testid="upload-files-list">
          {files.map((file: UploadFile, i: number) => (
            <li key={file.id} data-testid={`upload-file-${i}`}>
              {file.name} - {file.status}
            </li>
          ))}
        </ul>
      </div>

      <div data-testid="upload-event-log">
        <h2 data-testid="upload-event-log-title">Event Log</h2>
        <button data-testid="upload-clear-log-btn" onClick={clearLog}>
          Clear log
        </button>
        <p data-testid="upload-event-count">Events: {eventLog.length}</p>
        <ul data-testid="upload-event-list">
          {eventLog.map((entry, i) => (
            <li key={i} data-testid={`upload-event-${i}`}>
              <span data-testid={`upload-event-${i}-name`}>{entry.event}</span>
              {' | '}
              <span data-testid={`upload-event-${i}-data`}>
                {JSON.stringify(entry.data)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
