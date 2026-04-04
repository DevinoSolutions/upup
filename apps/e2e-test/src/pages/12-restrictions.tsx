import { useState, useCallback } from 'react'
import { useUpupUpload } from '@upup/react'
import type { UploadFile } from '@upup/shared'

type ErrorEntry = {
  id: number
  action: string
  message: string
}

// Helper: create a small 1x1 PNG (68 bytes)
function createSmallPng(name: string): File {
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ])
  return new File([pngBytes], name, { type: 'image/png' })
}

// Helper: create a text file
function createTextFile(name: string): File {
  return new File(['hello world'], name, { type: 'text/plain' })
}

// Helper: create a 2MB file
function createOversizedFile(name: string): File {
  const size = 2 * 1024 * 1024 // 2MB
  const buffer = new Uint8Array(size)
  return new File([buffer], name, { type: 'image/png' })
}

export default function Restrictions() {
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [nextId, setNextId] = useState(1)
  const [validationResults, setValidationResults] = useState<string[]>([])

  const logError = useCallback((action: string, message: string) => {
    setErrors(prev => [...prev, { id: nextId, action, message }])
    setNextId(prev => prev + 1)
  }, [nextId])

  const {
    files,
    addFiles,
    core,
  } = useUpupUpload({
    restrictions: {
      maxNumberOfFiles: 3,
      maxFileSize: { size: 1, unit: 'MB' },
      allowedFileTypes: ['image/*'],
    },
    onError: (error) => {
      logError('restriction', typeof error === 'string' ? error : error.message)
    },
  })

  const handleAddValidImage = async () => {
    try {
      await addFiles([createSmallPng(`valid-${Date.now()}.png`)])
    } catch (e) {
      logError('add-valid', e instanceof Error ? e.message : String(e))
    }
  }

  const handleAddInvalidType = async () => {
    try {
      await addFiles([createTextFile(`invalid-${Date.now()}.txt`)])
    } catch (e) {
      logError('add-invalid-type', e instanceof Error ? e.message : String(e))
    }
  }

  const handleAddOversized = async () => {
    try {
      await addFiles([createOversizedFile(`oversized-${Date.now()}.png`)])
    } catch (e) {
      logError('add-oversized', e instanceof Error ? e.message : String(e))
    }
  }

  const handleExceedLimit = async () => {
    try {
      const fourFiles = [
        createSmallPng(`exceed-1-${Date.now()}.png`),
        createSmallPng(`exceed-2-${Date.now()}.png`),
        createSmallPng(`exceed-3-${Date.now()}.png`),
        createSmallPng(`exceed-4-${Date.now()}.png`),
      ]
      await addFiles(fourFiles)
    } catch (e) {
      logError('exceed-limit', e instanceof Error ? e.message : String(e))
    }
  }

  const handleValidateFiles = async () => {
    const testFiles = [
      createSmallPng('valid.png'),
      createTextFile('invalid.txt'),
      createOversizedFile('oversized.png'),
    ]

    try {
      const results = await core.validateFiles(testFiles)
      setValidationResults(
        results.map(r =>
          `${r.file.name}: ${r.valid ? 'VALID' : 'INVALID'} ${r.errors.map(e => e.message).join(', ')}`
        )
      )
    } catch (e) {
      logError('validate', e instanceof Error ? e.message : String(e))
    }
  }

  const handleClearErrors = () => {
    setErrors([])
    setValidationResults([])
  }

  return (
    <div data-testid="restrict-root">
      <h1 data-testid="restrict-title">Restrictions</h1>

      <div data-testid="restrict-config">
        <h2 data-testid="restrict-config-title">Restriction Config</h2>
        <p data-testid="restrict-config-max-files">maxNumberOfFiles: 3</p>
        <p data-testid="restrict-config-max-size">maxFileSize: 1 MB</p>
        <p data-testid="restrict-config-allowed-types">allowedFileTypes: image/*</p>
      </div>

      <div data-testid="restrict-controls">
        <button data-testid="restrict-add-valid-btn" onClick={handleAddValidImage}>
          Add valid image
        </button>
        <button data-testid="restrict-add-invalid-type-btn" onClick={handleAddInvalidType}>
          Add invalid type
        </button>
        <button data-testid="restrict-add-oversized-btn" onClick={handleAddOversized}>
          Add oversized
        </button>
        <button data-testid="restrict-exceed-limit-btn" onClick={handleExceedLimit}>
          Exceed limit
        </button>
        <button data-testid="restrict-validate-btn" onClick={handleValidateFiles}>
          Validate files
        </button>
        <button data-testid="restrict-clear-btn" onClick={handleClearErrors}>
          Clear errors
        </button>
      </div>

      <div data-testid="restrict-status">
        <p data-testid="restrict-file-count">
          Current file count: <span data-testid="restrict-file-count-value">{files.length}</span>
        </p>
      </div>

      <div data-testid="restrict-file-list">
        <h2 data-testid="restrict-file-list-title">Files</h2>
        <ul data-testid="restrict-file-list-items">
          {files.map((file: UploadFile, index: number) => (
            <li key={file.id} data-testid={`restrict-file-${index}`}>
              <span data-testid={`restrict-file-${index}-name`}>{file.name}</span>
              {' | '}
              <span data-testid={`restrict-file-${index}-size`}>{file.size}</span>
              {' | '}
              <span data-testid={`restrict-file-${index}-status`}>{file.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <div data-testid="restrict-errors">
        <h2 data-testid="restrict-errors-title">Error Log</h2>
        <p data-testid="restrict-errors-count">
          Errors: <span data-testid="restrict-errors-count-value">{errors.length}</span>
        </p>
        <ul data-testid="restrict-errors-list">
          {errors.map((err) => (
            <li key={err.id} data-testid={`restrict-error-${err.id}`}>
              <span data-testid={`restrict-error-${err.id}-action`}>{err.action}</span>
              {': '}
              <span data-testid={`restrict-error-${err.id}-message`}>{err.message}</span>
            </li>
          ))}
        </ul>
      </div>

      <div data-testid="restrict-validation">
        <h2 data-testid="restrict-validation-title">Validation Results</h2>
        <ul data-testid="restrict-validation-list">
          {validationResults.map((result, i) => (
            <li key={i} data-testid={`restrict-validation-${i}`}>
              {result}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
