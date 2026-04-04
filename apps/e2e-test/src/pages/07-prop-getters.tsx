import { useRef } from 'react'
import { useUpupUpload } from '@upup/react'

export default function PropGetters() {
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    files,
    addFiles,
    getDropzoneProps,
    getRootProps,
    getInputProps,
  } = useUpupUpload({})

  const dropzoneProps = getDropzoneProps()
  const rootProps = getRootProps()
  const inputProps = getInputProps()

  const isDragging = dropzoneProps['aria-dropeffect'] === 'copy'

  const handleAddTestFile = async () => {
    const file = new File(['prop getter test'], 'proptest.txt', { type: 'text/plain' })
    await addFiles([file])
  }

  return (
    <div data-testid="propgetters-root" {...rootProps}>
      <h1 data-testid="propgetters-title">Prop Getters</h1>

      <div data-testid="propgetters-controls">
        <button data-testid="propgetters-add-btn" onClick={handleAddTestFile}>
          Add test file
        </button>
        <button
          data-testid="propgetters-open-picker-btn"
          onClick={() => inputRef.current?.click()}
        >
          Open file picker
        </button>
      </div>

      <div
        data-testid="propgetters-dropzone"
        {...dropzoneProps}
        style={{
          border: `2px dashed ${isDragging ? '#4caf50' : '#ccc'}`,
          padding: '40px',
          textAlign: 'center',
          background: isDragging ? '#e8f5e9' : '#fafafa',
          transition: 'all 0.2s',
          marginTop: '16px',
        }}
      >
        <p data-testid="propgetters-dropzone-text">
          {isDragging ? 'Drop files here!' : 'Drag files here or click to browse'}
        </p>
        <p data-testid="propgetters-dragging-indicator">
          Dragging: <span data-testid="propgetters-dragging-value">{String(isDragging)}</span>
        </p>
      </div>

      <input
        ref={inputRef}
        data-testid="propgetters-input"
        {...inputProps}
      />

      <div data-testid="propgetters-files-section">
        <p data-testid="propgetters-files-count">Files: {files.length}</p>
        <ul data-testid="propgetters-files-list">
          {files.map((file, i) => (
            <li key={file.id} data-testid={`propgetters-file-${i}`}>
              {file.name}
            </li>
          ))}
        </ul>
      </div>

      <div data-testid="propgetters-debug">
        <h2 data-testid="propgetters-debug-title">Prop Objects</h2>

        <div data-testid="propgetters-dropzone-props">
          <h3>getDropzoneProps()</h3>
          <pre data-testid="propgetters-dropzone-props-json">
            {JSON.stringify(
              Object.fromEntries(
                Object.entries(dropzoneProps).map(([k, v]) => [
                  k,
                  typeof v === 'function' ? '[Function]' : v,
                ])
              ),
              null,
              2
            )}
          </pre>
        </div>

        <div data-testid="propgetters-root-props">
          <h3>getRootProps()</h3>
          <pre data-testid="propgetters-root-props-json">
            {JSON.stringify(rootProps, null, 2)}
          </pre>
        </div>

        <div data-testid="propgetters-input-props">
          <h3>getInputProps()</h3>
          <pre data-testid="propgetters-input-props-json">
            {JSON.stringify(
              Object.fromEntries(
                Object.entries(inputProps).map(([k, v]) => [
                  k,
                  typeof v === 'function' ? '[Function]' : v,
                ])
              ),
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  )
}
