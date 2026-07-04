import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// Mutable state so individual tests can control uploadStatus/uploadError/uploadErrorCode.
let _uploadStatus = 'PENDING'
let _uploadError = ''
let _uploadErrorCode: string | undefined = undefined

function makeFilesMap(count: number): Map<string, any> {
    const map = new Map<string, any>()
    for (let i = 0; i < count; i++) {
        map.set(`f${i}`, { id: `f${i}`, name: `file-${i}.txt`, size: 1000, type: 'text/plain' })
    }
    return map
}

vi.mock('../src/context/UploaderContext', () => ({
    UploadStatus: {
        PENDING: 'PENDING',
        ONGOING: 'ONGOING',
        PAUSED: 'PAUSED',
        SUCCESSFUL: 'SUCCESSFUL',
        FAILED: 'FAILED',
    },
    useUploaderView: () => ({
        isAddingMore: false,
        viewMode: 'list',
    }),
    useUploaderSource: () => ({
        activeSource: null,
    }),
    useUploaderFiles: () => ({
        files: makeFilesMap(1),
    }),
    useUploaderI18n: () => ({
        translations: {
            uploadFiles_one: 'Upload {{count}} file',
            uploadFiles_other: 'Upload {{count}} files',
            done: 'Done',
            retryUpload: 'Retry',
            resumeUpload: 'Resume',
            pauseUpload: 'Pause',
            cancel: 'Cancel',
            uploadFailed: 'Upload failed: {{message}}',
            uploadFailedWithCode: 'Upload failed with error code: {{code}}',
        },
    }),
    useUploaderUploadControls: () => ({
        upload: {
            startUpload: vi.fn(),
            retryUpload: vi.fn(),
            uploadStatus: _uploadStatus,
            uploadError: _uploadError,
            uploadErrorCode: _uploadErrorCode,
            totalProgress: 0,
            uploadSpeed: 0,
            uploadEta: 0,
            uploadedBytes: 0,
            totalBytes: 0,
        },
        handleDone: vi.fn(),
        handleCancel: vi.fn(),
        handlePause: vi.fn(),
        handleResume: vi.fn(),
    }),
    useUploaderOptions: () => ({
        isProcessing: false,
        maxRetries: 0,
        resumable: undefined,
    }),
    useUploaderTheme: () => ({
        isDark: false,
        slotOverrides: {},
        slots: undefined,
    }),
}))

vi.mock('../src/components/FileItem', () => ({
    default: ({ file }: any) => <div data-testid="file-item">{file.name}</div>,
}))
vi.mock('../src/components/shared/UploaderHeader', () => ({
    default: () => <div data-testid="uploader-header" />,
}))
vi.mock('../src/components/shared/MyAnimatePresence', () => ({
    default: ({ children }: any) => <>{children}</>,
}))
vi.mock('../src/components/shared/ProgressBar', () => ({
    default: () => null,
}))
import FileList from '../src/components/FileList'

describe('FileList — default upload-error slot (P4/C10)', () => {
    beforeEach(() => {
        _uploadStatus = 'PENDING'
        _uploadError = ''
        _uploadErrorCode = undefined
    })

    it('renders no error slot when uploadStatus is not FAILED', () => {
        _uploadStatus = 'ONGOING'
        _uploadError = ''
        const { container } = render(<FileList />)
        expect(container.querySelector('[data-testid="upup-upload-error"]')).toBeNull()
    })

    it('renders no error slot when FAILED but uploadError is empty', () => {
        _uploadStatus = 'FAILED'
        _uploadError = ''
        const { container } = render(<FileList />)
        expect(container.querySelector('[data-testid="upup-upload-error"]')).toBeNull()
    })

    it('renders the error slot with the mapped message when FAILED and uploadError is set (no code)', () => {
        _uploadStatus = 'FAILED'
        _uploadError = 'Network timeout'
        _uploadErrorCode = undefined
        const { container } = render(<FileList />)
        const el = container.querySelector('[data-testid="upup-upload-error"]')
        expect(el).not.toBeNull()
        expect(el?.getAttribute('data-upup-slot')).toBe('upload-error')
        expect(el?.textContent).toContain('Network timeout')
    })

    it('renders the code-aware message when FAILED and uploadErrorCode is set', () => {
        _uploadStatus = 'FAILED'
        _uploadError = 'Signature mismatch'
        _uploadErrorCode = 'SignatureDoesNotMatch'
        const { container } = render(<FileList />)
        const el = container.querySelector('[data-testid="upup-upload-error"]')
        expect(el).not.toBeNull()
        expect(el?.getAttribute('title')).toBe('SignatureDoesNotMatch')
        expect(el?.textContent).toContain('SignatureDoesNotMatch')
    })
})
