import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import React from 'react'
import type { UploadFile } from '@upupjs/core'

// Item 7 — quiet-completion mode. FileList renders the checkmark-only overlay
// (`upup-complete-check`, no Done CTA) on SUCCESSFUL when the flag is on, and the
// normal Done button when it is off. Mocks the context like virtual-scroll.test.
let _quiet = false

vi.mock('../src/lib/use-tiles-per-row', () => ({
    useTilesPerRow: () => 0,
}))

vi.mock('../src/context/UploaderContext', () => ({
    UploadStatus: { SUCCESSFUL: 'SUCCESSFUL' },
    useUploaderView: () => ({
        viewMode: 'grid',
        setViewMode: () => {},
        sourceOverlayOpen: false,
        openSourceOverlay: () => {},
        closeSourceOverlay: () => {},
    }),
    useUploaderSource: () => ({ activeSource: null }),
    useUploaderFiles: () => ({
        files: new Map<string, UploadFile>([
            [
                'f0',
                {
                    id: 'f0',
                    name: 'a.txt',
                    size: 1,
                    type: 'text/plain',
                } as unknown as UploadFile,
            ],
        ]),
        leavingFileIds: new Set<string>(),
    }),
    useUploaderI18n: () => ({
        translations: {
            uploadFiles_one: 'Upload {{count}} file',
            uploadFiles_other: 'Upload {{count}} files',
            filesSelected_one: '{{count}} file',
            filesSelected_other: '{{count}} files',
            done: 'Done',
            retryUpload: 'Retry',
            resumeUpload: 'Resume',
            pauseUpload: 'Pause',
            cancel: 'Cancel',
            addMore: 'Add more',
            announceUploadComplete: 'Upload complete',
        },
    }),
    useUploaderUploadControls: () => ({
        upload: {
            startUpload: vi.fn(),
            retryUpload: vi.fn(),
            uploadStatus: 'SUCCESSFUL',
            totalProgress: 100,
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
        resumable: undefined,
        limit: 100,
        quietCompletion: _quiet,
        icons: { ContainerAddMoreIcon: () => null },
    }),
    useUploaderTheme: () => ({
        isDark: false,
        slotOverrides: {},
        slots: undefined,
    }),
}))

vi.mock('../src/components/FileItem', () => ({
    default: () => <div data-testid="file-item" />,
}))
vi.mock('../src/components/FileHero', () => ({
    default: () => <div data-testid="file-hero" />,
}))
vi.mock('../src/components/shared/UploaderHeader', () => ({
    default: () => <div data-testid="uploader-header" />,
}))
vi.mock('../src/components/shared/ProgressBar', () => ({
    default: () => null,
}))
import FileList from '../src/components/FileList'

describe('FileList — quiet completion (item 7)', () => {
    beforeEach(() => {
        _quiet = false
        cleanup()
    })

    it('shows the checkmark overlay and NO Done button when quietCompletion is on', () => {
        _quiet = true
        const { container, queryByText } = render(<FileList />)
        expect(
            container.querySelector('[data-testid="upup-complete-check"]'),
        ).not.toBeNull()
        expect(queryByText('Done')).toBeNull()
    })

    it('shows the Done button and NO overlay when quietCompletion is off', () => {
        _quiet = false
        const { container, queryByText } = render(<FileList />)
        expect(
            container.querySelector('[data-testid="upup-complete-check"]'),
        ).toBeNull()
        expect(queryByText('Done')).not.toBeNull()
    })
})
