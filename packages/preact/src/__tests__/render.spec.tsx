/**
 * render.spec.tsx — compat-seam render-level tests for @upupjs/preact
 *
 * Verifies that the compiled-on-preact/compat output mounts the expected DOM
 * structure. Does NOT re-test @upupjs/react logic (659 tests cover that).
 *
 * All data-testids verified against react source:
 *   upup-root         → packages/react/src/upup-uploader.tsx:66
 *   upup-container    → packages/react/src/upup-uploader.tsx:81
 *   upup-branding     → packages/react/src/upup-uploader.tsx:142
 *   upup-dropzone     → packages/react/src/components/UploaderPanel.tsx:36
 *   upup-file-input   → packages/react/src/components/SourceSelector.tsx:244
 *   upup-browse-files → packages/react/src/components/SourceSelector.tsx:293
 *   upup-source-${id} → packages/react/src/components/SourceSelector.tsx:208
 *                        id values from FileSource enum (packages/core/src/types/file-source.ts):
 *                        local | googleDrive | oneDrive | dropbox | box | url | camera | ...
 */

import { render, screen, cleanup } from '@testing-library/preact'
import { afterEach, describe, expect, test } from 'vitest'
import { UpupUploader, useUpupUpload, FileSource } from '../index'

afterEach(cleanup)

describe('@upupjs/preact render parity on compat', () => {
    // ── Root structure ──────────────────────────────────────────────────────────

    test('mounts root + container', () => {
        render(<UpupUploader />)
        // upup-root: outermost div (upup-uploader.tsx:66)
        expect(screen.getByTestId('upup-root')).toBeTruthy()
        // upup-container: the section element inside (upup-uploader.tsx:81)
        expect(screen.getByTestId('upup-container')).toBeTruthy()
    })

    test('mounts dropzone inside the container', () => {
        render(<UpupUploader />)
        // upup-dropzone: UploaderPanel.tsx, role="region" (F-765) with drag/drop handlers
        const dropzone = screen.getByTestId('upup-dropzone')
        expect(dropzone).toBeTruthy()
        // The dropzone also carries the correct role
        expect(dropzone.getAttribute('role')).toBe('region')
    })

    // ── Branding ────────────────────────────────────────────────────────────────

    test('renders branding in default (non-mini) mode', () => {
        render(<UpupUploader />)
        // upup-branding: upup-uploader.tsx:142, shown when !mini && showBranding !== false
        expect(screen.getByTestId('upup-branding')).toBeTruthy()
    })

    test('honors mini prop — branding absent in mini mode', () => {
        render(<UpupUploader mini />)
        // Branding renders only when !mini && showBranding !== false
        expect(screen.queryByTestId('upup-branding')).toBeNull()
    })

    test('honors showBranding=false — branding absent when explicitly hidden', () => {
        render(<UpupUploader showBranding={false} />)
        expect(screen.queryByTestId('upup-branding')).toBeNull()
    })

    // ── File input ───────────────────────────────────────────────────────────────

    test('hidden file input is present in non-mini mode', () => {
        render(<UpupUploader />)
        // upup-file-input: SourceSelector.tsx:244, type="file" aria-hidden="true"
        const input = screen.getByTestId('upup-file-input')
        expect(input).toBeTruthy()
        expect(input.getAttribute('type')).toBe('file')
    })

    test('hidden file input is present in mini mode too', () => {
        render(<UpupUploader mini />)
        // File input renders regardless of mini — it is not gated by the mini branch
        const input = screen.getByTestId('upup-file-input')
        expect(input).toBeTruthy()
        expect(input.getAttribute('type')).toBe('file')
    })

    // ── Source tiles (non-mini only, via SourceSelector) ──────────────────────

    test('renders the local (device) source tile', () => {
        render(<UpupUploader />)
        // FileSource.LOCAL = 'local' → data-testid="upup-source-local"
        // SourceSelector.tsx:208: data-testid={`upup-source-${id}`}
        expect(screen.getByTestId('upup-source-local')).toBeTruthy()
    })

    test('renders the browse-files button in non-mini mode', () => {
        render(<UpupUploader />)
        // upup-browse-files: SourceSelector.tsx:293
        expect(screen.getByTestId('upup-browse-files')).toBeTruthy()
    })

    // ── Re-exports: hook + enum ─────────────────────────────────────────────────

    test('useUpupUpload is a function (headless hook re-exported)', () => {
        // Stronger than toBeTruthy() — confirms the hook exported correctly
        expect(typeof useUpupUpload).toBe('function')
    })

    test('FileSource exposes known enum members with correct string values', () => {
        // Derived from packages/core/src/types/file-source.ts
        expect(FileSource.LOCAL).toBe('local')
        expect(FileSource.GOOGLE_DRIVE).toBe('googleDrive')
        expect(FileSource.URL).toBe('url')
        expect(FileSource.CAMERA).toBe('camera')
    })
})
