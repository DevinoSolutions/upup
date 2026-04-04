import { useUpupUpload } from '@upup/react'
import { UploadStatus, type UploadFile } from '@upup/shared'

export default function FileOperations() {
  const {
    files,
    addFiles,
    removeFile,
    removeAll,
    reorderFiles,
  } = useUpupUpload({})

  const handleAddTestFiles = async () => {
    const testFiles = [
      new File(['hello world'], 'test-file-1.txt', { type: 'text/plain' }),
      new File(['foo bar baz'], 'test-file-2.txt', { type: 'text/plain' }),
      new File([new Uint8Array(1024)], 'test-file-3.bin', { type: 'application/octet-stream' }),
    ]
    await addFiles(testFiles)
  }

  const handleRemoveFirst = () => {
    if (files.length > 0) {
      removeFile(files[0].id)
    }
  }

  const handleReorder = () => {
    if (files.length > 1) {
      const reversedIds = [...files].reverse().map(f => f.id)
      reorderFiles(reversedIds)
    }
  }

  return (
    <div data-testid="files-root">
      <h1 data-testid="files-title">File Operations</h1>

      <div data-testid="files-controls">
        <button data-testid="files-add-btn" onClick={handleAddTestFiles}>
          Add test files
        </button>
        <button data-testid="files-remove-first-btn" onClick={handleRemoveFirst}>
          Remove first
        </button>
        <button data-testid="files-remove-all-btn" onClick={removeAll}>
          Remove all
        </button>
        <button data-testid="files-reorder-btn" onClick={handleReorder}>
          Reorder
        </button>
      </div>

      <p data-testid="files-count">
        File count: <span data-testid="files-count-value">{files.length}</span>
      </p>

      <ul data-testid="files-list">
        {files.map((file: UploadFile, index: number) => (
          <li key={file.id} data-testid={`files-item-${index}`}>
            <span data-testid={`files-item-${index}-id`}>{file.id}</span>
            {' | '}
            <span data-testid={`files-item-${index}-name`}>{file.name}</span>
            {' | '}
            <span data-testid={`files-item-${index}-size`}>{file.size}</span>
            {' | '}
            <span data-testid={`files-item-${index}-source`}>{file.source}</span>
            {' | '}
            <span data-testid={`files-item-${index}-status`}>{file.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
