import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import React from 'react'
import { UploadStatus } from '@upupjs/core'
import type { UploadFile } from '@upupjs/core'

afterEach(cleanup)

const tr = {
    zeroBytes: '0 B',
    bytes: 'B',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    removeFile: 'Remove file',
    uploadProgress: 'Upload progress',
    clickToPreview: 'Click to preview',
    editImage: 'Edit image',
}

const file = {
    id: 'f1',
    name: 'a.png',
    size: 1000,
    type: 'image/png',
    url: 'blob:x',
    status: UploadStatus.UPLOADING,
} as unknown as UploadFile

// Active upload with the file at 42% — the state where per-file % must show
// on the row + hero (spec §4.5) but NOT on the grid tile (FilePreview).
vi.mock('../src/context/UploaderContext', () => ({
    UploadStatus,
    useUploaderFiles: () => ({
        handleFileRemove: vi.fn(),
        files: new Map([['f1', file]]),
    }),
    useUploaderI18n: () => ({ translations: tr }),
    useUploaderEditor: () => ({ openImageEditor: vi.fn() }),
    useUploaderOptions: () => ({
        icons: { FileDeleteIcon: () => null },
        allowPreview: false,
        imageEditor: { enabled: false },
    }),
    useUploaderTheme: () => ({
        isDark: true,
        slotOverrides: {},
        slots: undefined,
    }),
    useUploaderUploadControls: () => ({
        upload: {
            filesProgressMap: { f1: { loaded: 42, total: 100 } },
            uploadStatus: UploadStatus.UPLOADING,
        },
    }),
}))

import FileHero from '../src/components/FileHero'
import FileRow from '../src/components/FileRow'
import FilePreview from '../src/components/FilePreview'

describe('per-file numeric % (spec §4.5)', () => {
    it('shows the % on the single-file hero during upload', () => {
        const { container } = render(<FileHero file={file} />)
        expect(container.textContent).toContain('42%')
    })

    it('shows the % on the list row during upload', () => {
        const { container } = render(<FileRow file={file} />)
        expect(container.textContent).toContain('42%')
    })

    it('does NOT show the % on the grid tile (FilePreview)', () => {
        const { container } = render(
            <FilePreview
                fileName="a.png"
                fileType="image/png"
                fileId="f1"
                fileUrl="blob:x"
                fileSize={1000}
                canPreview={false}
                setCanPreview={vi.fn()}
            />,
        )
        // the tile still renders the progress bar, just without the % label
        expect(
            container.querySelector('[data-testid="upup-progress-bar"]'),
        ).not.toBeNull()
        expect(container.textContent).not.toContain('42%')
    })
})
