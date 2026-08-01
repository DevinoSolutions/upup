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

vi.mock('../src/context/UploaderContext', () => ({
    UploadStatus,
    useUploaderFiles: () => ({ handleFileRemove: vi.fn() }),
    useUploaderI18n: () => ({ translations: tr }),
    useUploaderOptions: () => ({
        icons: { FileDeleteIcon: () => null },
        imageEditor: { enabled: false },
    }),
    useUploaderEditor: () => ({ openImageEditor: vi.fn() }),
    useUploaderTheme: () => ({
        isDark: true,
        slotOverrides: {},
        slots: undefined,
    }),
    useUploaderUploadControls: () => ({
        upload: { filesProgressMap: {}, uploadStatus: UploadStatus.SUCCESSFUL },
    }),
}))

import FileHero from '../src/components/FileHero'

function makeFile(status: UploadStatus): UploadFile {
    return {
        id: 'f1',
        name: 'a.png',
        size: 1000,
        type: 'image/png',
        url: 'blob:x',
        status,
    } as unknown as UploadFile
}

describe('completion checkmark', () => {
    it('renders the file-success mark with the draw + pop fx when a file is SUCCESSFUL', () => {
        const { container } = render(
            <FileHero file={makeFile(UploadStatus.SUCCESSFUL)} />,
        )
        const mark = container.querySelector('[data-upup-slot="file-success"]')
        expect(mark).not.toBeNull()
        // wrapper pops, the tick path draws — both fx classes present + gated
        expect(mark?.className).toContain('upup-animate-fx-pop')
        const tick = mark?.querySelector('path')
        expect(tick?.getAttribute('class')).toContain('upup-animate-fx-draw')
        expect(tick?.getAttribute('pathLength')).toBe('24')
        // completion is conveyed textually elsewhere — the mark is decorative
        expect(mark?.getAttribute('aria-hidden')).toBe('true')
    })

    it('does not render the mark while a file is still uploading', () => {
        const { container } = render(
            <FileHero file={makeFile(UploadStatus.UPLOADING)} />,
        )
        expect(
            container.querySelector('[data-upup-slot="file-success"]'),
        ).toBeNull()
    })
})
