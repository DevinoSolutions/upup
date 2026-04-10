import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// Mutable state so individual tests can control file count + viewMode
let _fileCount = 0
let _viewMode: 'list' | 'grid' = 'list'

function makeFile(id: string) {
    return { id, name: `file-${id}.txt`, size: 1000, type: 'text/plain' }
}
function makeFilesMap(count: number): Map<string, any> {
    const map = new Map<string, any>()
    for (let i = 0; i < count; i++) {
        map.set(`f${i}`, makeFile(`f${i}`))
    }
    return map
}

vi.mock('../src/context/RootContext', () => ({
    UploadStatus: {
        PENDING: 'PENDING',
        ONGOING: 'ONGOING',
        PAUSED: 'PAUSED',
        SUCCESSFUL: 'SUCCESSFUL',
        FAILED: 'FAILED',
    },
    useRootContext: () => ({
        isAddingMore: false,
        activeAdapter: null,
        files: makeFilesMap(_fileCount),
        translations: {
            uploadFiles: 'Upload {count} file',
            uploadFilesPlural: 'Upload {count} files',
            done: 'Done',
            retryUpload: 'Retry',
            resumeUpload: 'Resume',
            pauseUpload: 'Pause',
        },
        upload: {
            proceedUpload: vi.fn(),
            uploadStatus: 'PENDING',
            totalProgress: 0,
            uploadSpeed: 0,
            uploadEta: 0,
            uploadedBytes: 0,
            totalBytes: 0,
        },
        props: {
            dark: false,
            classNames: {},
            isProcessing: false,
            maxRetries: 0,
            resumable: undefined,
        },
        handleDone: vi.fn(),
        handleCancel: vi.fn(),
        handlePause: vi.fn(),
        handleResume: vi.fn(),
        viewMode: _viewMode,
    }),
}))

vi.mock('../src/components/FileItem', () => ({
    default: ({ file }: any) => <div data-testid="file-item">{file.name}</div>,
}))
vi.mock('../src/components/shared/MainBoxHeader', () => ({
    default: () => <div data-testid="main-box-header" />,
}))
vi.mock('../src/components/shared/MyAnimatePresence', () => ({
    default: ({ children }: any) => <>{children}</>,
}))
vi.mock('../src/components/shared/ProgressBar', () => ({
    default: () => null,
}))
vi.mock('../src/components/shared/ShouldRender', () => ({
    default: ({ if: cond, children }: any) => (cond ? <>{children}</> : null),
}))

import FileList from '../src/components/FileList'

describe('FileList — virtual scrolling', () => {
    beforeEach(() => {
        _fileCount = 0
        _viewMode = 'list'
    })

    it('does NOT use virtual scroll when files < threshold (19 files, list)', () => {
        _fileCount = 19
        _viewMode = 'list'
        const { container } = render(<FileList />)
        expect(container.querySelector('[data-upup-slot="file-list-virtual"]')).toBeNull()
        expect(container.querySelectorAll('[data-testid="file-item"]').length).toBe(19)
    })

    it('DOES use virtual scroll when files >= threshold (20 files, list)', () => {
        _fileCount = 20
        _viewMode = 'list'
        const { container } = render(<FileList />)
        expect(container.querySelector('[data-upup-slot="file-list-virtual"]')).not.toBeNull()
    })

    it('does NOT use virtual scroll in grid mode even with many files', () => {
        _fileCount = 30
        _viewMode = 'grid'
        const { container } = render(<FileList />)
        expect(container.querySelector('[data-upup-slot="file-list-virtual"]')).toBeNull()
    })
})
