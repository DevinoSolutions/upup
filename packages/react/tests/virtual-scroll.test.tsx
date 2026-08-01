import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import type { UploadFile } from '@upupjs/core'

// Mutable state so individual tests can control file count + viewMode + the
// measured tiles-per-row (the adaptive grid→list seam; jsdom has no layout).
let _fileCount = 0
let _viewMode: 'list' | 'grid' = 'list'
let _tilesPerRow = 0

// The grid→list decision is driven by the measured tiles-per-row. FileList
// measures it via useTilesPerRow (ResizeObserver), absent in jsdom — mock the
// seam so each test drives the rule directly.
vi.mock('../src/lib/use-tiles-per-row', () => ({
    useTilesPerRow: () => _tilesPerRow,
}))

function makeFile(id: string) {
    return { id, name: `file-${id}.txt`, size: 1000, type: 'text/plain' }
}
function makeFilesMap(count: number): Map<string, UploadFile> {
    const map = new Map<string, UploadFile>()
    for (let i = 0; i < count; i++) {
        map.set(`f${i}`, makeFile(`f${i}`) as unknown as UploadFile)
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
        viewMode: _viewMode,
        setViewMode: () => {},
        sourceOverlayOpen: false,
        openSourceOverlay: () => {},
        closeSourceOverlay: () => {},
    }),
    useUploaderSource: () => ({
        activeSource: null,
    }),
    useUploaderFiles: () => ({
        files: makeFilesMap(_fileCount),
        leavingFileIds: new Set<string>(),
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
        },
    }),
    useUploaderUploadControls: () => ({
        upload: {
            startUpload: vi.fn(),
            retryUpload: vi.fn(),
            uploadStatus: 'PENDING',
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
        limit: 100,
        icons: { ContainerAddMoreIcon: () => null },
    }),
    useUploaderTheme: () => ({
        isDark: false,
        slotOverrides: {},
        slots: undefined,
    }),
}))

vi.mock('../src/components/FileItem', () => ({
    default: ({ file }: { file: UploadFile }) => (
        <div data-testid="file-item">{file.name}</div>
    ),
}))
vi.mock('../src/components/shared/UploaderHeader', () => ({
    default: () => <div data-testid="uploader-header" />,
}))
vi.mock('../src/components/shared/MyAnimatePresence', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('../src/components/shared/ProgressBar', () => ({
    default: () => null,
}))
import FileList from '../src/components/FileList'

describe('FileList — virtual scrolling', () => {
    beforeEach(() => {
        _fileCount = 0
        _viewMode = 'list'
        _tilesPerRow = 0
    })

    it('does NOT use virtual scroll when files < threshold (19 files, list)', () => {
        _fileCount = 19
        _viewMode = 'list'
        const { container } = render(<FileList />)
        expect(
            container.querySelector('[data-upup-slot="file-list-virtual"]'),
        ).toBeNull()
        expect(
            container.querySelectorAll('[data-testid="file-item"]').length,
        ).toBe(19)
    })

    it('DOES use virtual scroll when files >= threshold (20 files, list)', () => {
        _fileCount = 20
        _viewMode = 'list'
        const { container } = render(<FileList />)
        expect(
            container.querySelector('[data-upup-slot="file-list-virtual"]'),
        ).not.toBeNull()
    })

    it('forces the row list when tiles do not fit one row: many files virtualize even in grid mode', () => {
        _fileCount = 30
        _viewMode = 'grid'
        _tilesPerRow = 3 // 30 > 3 → the tile grid can't fit one row → forced list
        const { container } = render(<FileList />)
        // The tiles no longer fit one row of the fixed panel, so the row list
        // (and its virtualization) engages regardless of the user's toggle.
        expect(
            container.querySelector('[data-upup-slot="file-list-virtual"]'),
        ).not.toBeNull()
    })

    it('honors grid mode when the tiles fit one row (no virtualization)', () => {
        _fileCount = 4
        _viewMode = 'grid'
        _tilesPerRow = 4 // 4 <= 4 → tiles fit one row → grid honored
        const { container } = render(<FileList />)
        expect(
            container.querySelector('[data-upup-slot="file-list-virtual"]'),
        ).toBeNull()
        expect(
            container.querySelectorAll('[data-testid="file-item"]').length,
        ).toBe(4)
    })
})
