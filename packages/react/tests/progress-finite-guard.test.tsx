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
}

// Active upload + EMPTY progress map = the leak the guard closes: without it,
// (loaded/total) is NaN and ProgressBar (which renders while isUploadActive)
// would emit aria-valuenow="NaN" / width:NaN%.
vi.mock('../src/context/UploaderContext', () => ({
    UploadStatus,
    useUploaderFiles: () => ({ handleFileRemove: vi.fn() }),
    useUploaderI18n: () => ({ translations: tr }),
    useUploaderOptions: () => ({ icons: { FileDeleteIcon: () => null } }),
    useUploaderTheme: () => ({
        isDark: true,
        slotOverrides: {},
        slots: undefined,
    }),
    useUploaderUploadControls: () => ({
        upload: {
            filesProgressMap: {},
            uploadStatus: UploadStatus.UPLOADING,
        },
    }),
}))

import FileHero from '../src/components/FileHero'

const file = {
    id: 'f1',
    name: 'a.png',
    size: 1000,
    type: 'image/png',
    url: 'blob:x',
} as unknown as UploadFile

describe('finite progress guard', () => {
    it('renders aria-valuenow=0 (not NaN) when an upload is active but the file has no progress entry', () => {
        const { container } = render(<FileHero file={file} />)
        const bar = container.querySelector('[data-testid="upup-progress-bar"]')
        expect(bar).not.toBeNull()
        expect(bar?.getAttribute('aria-valuenow')).toBe('0')
    })
})
