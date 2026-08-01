import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import React from 'react'

// Mutable so tests flip the rejection on/off (the store drives this in prod).
let _dropRejected: string | null = null

vi.mock('../src/context/UploaderContext', () => ({
    UploadStatus: {
        UPLOADING: 'UPLOADING',
        SUCCESSFUL: 'SUCCESSFUL',
        FAILED: 'FAILED',
    },
    useUploaderFiles: () => ({ files: new Map() }),
    useUploaderSource: () => ({ activeSource: undefined }),
    useUploaderView: () => ({
        sourceOverlayOpen: false,
        sourceOverlayClosing: false,
        dropRejected: _dropRejected,
        closeSourceOverlay: vi.fn(),
    }),
    useUploaderRuntime: () => ({ isOnline: true, motionMode: 'on' }),
    useUploaderOptions: () => ({ mini: false, showBranding: false }),
    useUploaderI18n: () => ({
        translations: {
            dropzoneLabel: 'Drop files',
            addingMoreFiles: 'Adding more',
            dropRejected: "We can't add files to your {{provider}}",
            announceUploadStarted: '',
            announceUploadComplete: '',
            announceUploadFailed: '',
        },
    }),
    useUploaderTheme: () => ({ isDark: true }),
    useUploaderUploadControls: () => ({ upload: { uploadStatus: 'IDLE' } }),
}))

vi.mock('../src/hooks/useUploaderPanel', () => ({
    default: () => ({
        isDragging: false,
        absoluteIsDragging: false,
        absoluteHasBorder: false,
        handleDragOver: vi.fn(),
        handleDragLeave: vi.fn(),
        handleDrop: vi.fn(),
        handlePaste: vi.fn(),
    }),
}))

vi.mock('../src/components/SourceSelector', () => ({ default: () => null }))
vi.mock('../src/components/SourceView', () => ({ default: () => null }))
vi.mock('../src/components/FileList', () => ({ default: () => null }))

import UploaderPanel from '../src/components/UploaderPanel'

describe('drop-rejected toast', () => {
    beforeEach(() => {
        _dropRejected = null
        cleanup()
    })

    it('renders no toast when nothing is rejected', () => {
        const { container } = render(<UploaderPanel />)
        expect(
            container.querySelector('[data-testid="upup-drop-rejected-toast"]'),
        ).toBeNull()
    })

    it('renders the toast with the provider-filled copy when a drop is rejected', () => {
        _dropRejected = 'Google Drive'
        const { container } = render(<UploaderPanel />)
        const toast = container.querySelector(
            '[data-testid="upup-drop-rejected-toast"]',
        )
        expect(toast).not.toBeNull()
        expect(toast?.getAttribute('role')).toBe('status')
        expect(toast?.getAttribute('aria-live')).toBe('polite')
        expect(toast?.textContent).toContain(
            "We can't add files to your Google Drive",
        )
    })

    it('unmounts the toast when the store clears the rejection (auto-clear)', () => {
        _dropRejected = 'Dropbox'
        const { container, rerender } = render(<UploaderPanel />)
        expect(
            container.querySelector('[data-testid="upup-drop-rejected-toast"]'),
        ).not.toBeNull()
        _dropRejected = null
        rerender(<UploaderPanel />)
        expect(
            container.querySelector('[data-testid="upup-drop-rejected-toast"]'),
        ).toBeNull()
    })
})
