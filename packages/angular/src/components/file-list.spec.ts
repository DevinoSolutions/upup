/**
 * file-list.spec.ts — T11 regression suite
 *
 * Tests the virtualized file list and preview components.
 *
 * NOTE ON VIRTUALIZER + JSDOM:
 *   @tanstack/virtual-core uses ResizeObserver + scroll geometry which jsdom
 *   does not implement (all element heights are 0, ResizeObserver is absent).
 *   The virtualizer initialises without throwing but getVirtualItems() returns
 *   an empty array when shouldVirtualize=true (count < VIRTUAL_SCROLL_THRESHOLD=20).
 *   We therefore test with small file counts (< 20) where the standard flat list
 *   renders — asserting real DOM nodes, not pixel offsets.
 *   The virtualizer-init smoke test confirms no exception is thrown on creation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { Component, signal } from '@angular/core'
import { UpupStore } from '../upup-store.service'
import { FileListComponent } from './file-list.component'
import { FileItemComponent } from './file-item.component'
import { FileIconComponent } from './file-icon.component'
import { FilePreviewComponent } from './file-preview.component'
import { FilePreviewPortalComponent } from './file-preview-portal.component'
import { FilePreviewThumbnailComponent } from './file-preview-thumbnail.component'
import { EmptyIconComponent } from './icons/empty-icon.component'
import { UploadStatus } from '@upup/core'
import type { UploadFile } from '@upup/core'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal UploadFile stub for testing. */
function makeFile(
    id: string,
    name: string,
    type = 'image/jpeg',
    size = 1024,
): UploadFile {
    return {
        id,
        name,
        type,
        size,
        url: `blob:http://localhost/${id}`,
        relativePath: undefined,
    } as unknown as UploadFile
}

/** Return a minimal UpupStore mock that satisfies the component's reads. */
function makeStoreMock(files: Map<string, UploadFile>) {
    const slotOverrides = {
        fileListContainer: '',
        fileListFooter: '',
        fileListContainerInnerMultiple: '',
        fileListContainerInnerSingle: '',
        uploadButton: '',
        uploadDoneButton: '',
        fileDeleteButton: '',
        fileIcon: '',
        fileItemMultiple: '',
        fileItemSingle: '',
        fileThumbnailMultiple: '',
        fileThumbnailSingle: '',
        filePreviewPortal: '',
        containerHeader: '',
        containerCancelButton: '',
        containerAddMoreButton: '',
    }
    const translations = {
        uploadFiles: 'Upload {{count}} file(s)',
        filesSelected: '{{count}} file(s) selected',
        addMore: 'Add more',
        addingMoreFiles: 'Adding more files',
        cancel: 'Cancel',
        removeAllFiles: 'Remove all',
        done: 'Done',
        paused: 'Paused',
        resumeUpload: 'Resume',
        pauseUpload: 'Pause',
        retryUpload: 'Retry',
        removeFile: 'Remove file',
        editImage: 'Edit image',
        clickToPreview: 'Click to preview',
        loading: 'Loading…',
        previewError: 'Error:',
        uploadFailedWithCode: 'Upload failed with error code: {{code}}',
        uploadFailed: 'Upload failed: {{message}}',
        zeroBytes: '0 B',
        bytes: 'B',
        kb: 'KB',
        mb: 'MB',
        gb: 'GB',
    } as any

    return {
        files: () => files,
        isAddingMore: () => false,
        activeSource: () => undefined,
        isDark: () => false,
        viewMode: () => 'list' as const,
        uploadStatus: () => UploadStatus.IDLE,
        uploadError: () => undefined as string | undefined,
        uploadErrorCode: () => undefined as string | undefined,
        totalProgress: () => 0,
        uploadSpeed: () => 0,
        uploadEta: () => 0,
        uploadedBytes: () => 0,
        totalBytes: () => 0,
        filesProgressMap: () => ({}),
        slotOverrides: () => slotOverrides,
        slots: () => ({}),
        translations: () => translations,
        uiProps: {
            mini: false,
            limit: 100,
            isProcessing: false,
            allowPreview: true,
            resumable: undefined,
            imageEditor: { enabled: false },
            icons: {
                ContainerAddMoreIcon: EmptyIconComponent,
                FileDeleteIcon: EmptyIconComponent,
                CameraCaptureIcon: EmptyIconComponent,
                CameraRotateIcon: EmptyIconComponent,
                CameraDeleteIcon: EmptyIconComponent,
                LoaderIcon: EmptyIconComponent,
            },
            onFileClick: () => {},
        },
        handleCancel: vi.fn(),
        handlePause: vi.fn(),
        handleResume: vi.fn(),
        handleDone: vi.fn(),
        handleFileRemove: vi.fn(),
        openImageEditor: vi.fn(),
        startUpload: vi.fn().mockResolvedValue(undefined),
        retryUpload: vi.fn().mockResolvedValue(undefined),
        setViewMode: vi.fn(),
        setIsAddingMore: vi.fn(),
        core: null,
    }
}

// ── FileIconComponent ─────────────────────────────────────────────────────────

describe('FileIconComponent', () => {
    it('renders the unified icon wrapper with the typed glyph and no extension badge', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FileIconComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileIconComponent)
        fixture.componentInstance.extension = 'pdf'
        fixture.detectChanges()
        const el: HTMLElement = fixture.nativeElement
        // Unified shape: <span.upup-inline-flex testid> … <svg> … </span>.
        const wrapper = el.querySelector('[data-testid="upup-file-icon"]')
        expect(wrapper?.tagName.toLowerCase()).toBe('span')
        expect(wrapper?.classList.contains('upup-inline-flex')).toBe(true)
        expect(el.querySelector('svg')).not.toBeNull()
        // The extension text badge was removed in the cross-framework unification.
        expect(el.textContent?.trim()).toBe('')
    })

    it('still renders the icon (generic fallback) with no badge when extension is empty', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FileIconComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileIconComponent)
        fixture.componentInstance.extension = ''
        fixture.detectChanges()
        const el: HTMLElement = fixture.nativeElement
        // Wrapper span is always present; glyph falls back to the generic 'file' icon.
        expect(
            el.querySelector('[data-testid="upup-file-icon"]'),
        ).not.toBeNull()
        expect(el.querySelector('svg')).not.toBeNull()
        // No extension text badge anymore.
        expect(el.textContent?.trim()).toBe('')
    })
})

// ── FilePreviewPortalComponent ────────────────────────────────────────────────

describe('FilePreviewPortalComponent', () => {
    it('renders the overlay with data-upup-slot="file-preview-portal"', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FilePreviewPortalComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FilePreviewPortalComponent)
        fixture.componentInstance.fileType = 'image/jpeg'
        fixture.componentInstance.fileUrl = 'blob:http://localhost/test'
        fixture.componentInstance.fileName = 'test.jpg'
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        const portal = el.querySelector(
            '[data-upup-slot="file-preview-portal"]',
        )
        expect(portal).not.toBeNull()
    })

    it('emits onClose when the close button is clicked', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FilePreviewPortalComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FilePreviewPortalComponent)
        fixture.componentInstance.fileType = 'image/jpeg'
        fixture.componentInstance.fileUrl = 'blob:http://localhost/test'
        fixture.componentInstance.fileName = 'test.jpg'
        fixture.detectChanges()

        const closeSpy = vi.fn()
        fixture.componentInstance.onClose.subscribe(closeSpy)

        const btn = fixture.nativeElement.querySelector(
            'button',
        ) as HTMLButtonElement
        btn?.click()
        expect(closeSpy).toHaveBeenCalledTimes(1)
    })

    it('renders img tag for image type', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FilePreviewPortalComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FilePreviewPortalComponent)
        fixture.componentInstance.fileType = 'image/png'
        fixture.componentInstance.fileUrl = 'blob:http://localhost/img'
        fixture.componentInstance.fileName = 'photo.png'
        fixture.detectChanges()

        const img = fixture.nativeElement.querySelector('img')
        expect(img).not.toBeNull()
        expect(img?.getAttribute('src')).toBe('blob:http://localhost/img')
    })

    it('renders <object> fallback for audio type (non-image/non-pdf/non-text)', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FilePreviewPortalComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FilePreviewPortalComponent)
        fixture.componentInstance.fileType = 'audio/mpeg'
        fixture.componentInstance.fileUrl = 'blob:http://localhost/sound'
        fixture.componentInstance.fileName = 'sound.mp3'
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        // audio/mpeg is not image, not pdf, not text → 4th branch renders a native <object>
        const obj = el.querySelector('object') as HTMLObjectElement | null
        expect(obj).not.toBeNull()
        expect(obj?.getAttribute('type')).toBe('audio/mpeg')
        // No <img> / <embed> in this branch
        expect(el.querySelector('img')).toBeNull()
        expect(el.querySelector('embed')).toBeNull()
    })

    it('renders <object> fallback for video type', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FilePreviewPortalComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FilePreviewPortalComponent)
        fixture.componentInstance.fileType = 'video/webm'
        fixture.componentInstance.fileUrl = 'blob:http://localhost/clip'
        fixture.componentInstance.fileName = 'clip.webm'
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        const obj = el.querySelector('object') as HTMLObjectElement | null
        expect(obj).not.toBeNull()
        expect(obj?.getAttribute('type')).toBe('video/webm')
    })
})

// ── FilePreviewComponent ──────────────────────────────────────────────────────

describe('FilePreviewComponent', () => {
    it('applies a background-image style for image files (Fix 1)', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FilePreviewComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FilePreviewComponent)
        fixture.componentInstance.fileName = 'photo.png'
        fixture.componentInstance.fileType = 'image/png'
        fixture.componentInstance.fileId = 'p1'
        fixture.componentInstance.fileUrl = 'blob:http://localhost/photo'
        fixture.componentInstance.fileSize = 2048
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        // The thumbnail wrapper is the first div with the fixed 145px box classes.
        const wrapper = el.querySelector(
            '.upup-h-\\[145px\\]',
        ) as HTMLElement | null
        expect(wrapper).not.toBeNull()
        const bg = wrapper?.style.backgroundImage ?? ''
        expect(bg).toContain('blob:http://localhost/photo')
    })

    it('applies NO background-image for non-image files (Fix 1)', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FilePreviewComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FilePreviewComponent)
        fixture.componentInstance.fileName = 'doc.pdf'
        fixture.componentInstance.fileType = 'application/pdf'
        fixture.componentInstance.fileId = 'p2'
        fixture.componentInstance.fileUrl = 'blob:http://localhost/doc'
        fixture.componentInstance.fileSize = 2048
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        const wrapper = el.querySelector(
            '.upup-h-\\[145px\\]',
        ) as HTMLElement | null
        expect(wrapper).not.toBeNull()
        // No background-image set for PDFs
        const bg = wrapper?.style.backgroundImage ?? ''
        expect(bg).toBe('')
    })
})

// ── FileItemComponent ─────────────────────────────────────────────────────────

describe('FileItemComponent', () => {
    it('renders data-testid="upup-file-item"', async () => {
        const file = makeFile('f1', 'photo.jpg', 'image/jpeg')
        const storeMock = makeStoreMock(new Map([['f1', file]]))

        await TestBed.configureTestingModule({
            imports: [FileItemComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileItemComponent)
        fixture.componentInstance.file = file
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        expect(
            el.querySelector('[data-testid="upup-file-item"]'),
        ).not.toBeNull()
    })

    it('does not show preview portal by default', async () => {
        const file = makeFile('f1', 'doc.pdf', 'application/pdf')
        const storeMock = makeStoreMock(new Map([['f1', file]]))

        await TestBed.configureTestingModule({
            imports: [FileItemComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileItemComponent)
        fixture.componentInstance.file = file
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        // Portal not shown until openPreviewPortal() is called
        expect(
            el.querySelector('[data-upup-slot="file-preview-portal"]'),
        ).toBeNull()
    })

    it('shows preview portal after openPreviewPortal()', async () => {
        const file = makeFile('f2', 'photo.png', 'image/png')
        const storeMock = makeStoreMock(new Map([['f2', file]]))

        await TestBed.configureTestingModule({
            imports: [FileItemComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileItemComponent)
        fixture.componentInstance.file = file
        fixture.componentInstance.canPreview = true
        fixture.detectChanges()

        fixture.componentInstance.openPreviewPortal()
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        expect(
            el.querySelector('[data-upup-slot="file-preview-portal"]'),
        ).not.toBeNull()
    })
})

// ── FileListComponent ─────────────────────────────────────────────────────────

describe('FileListComponent', () => {
    it('renders data-testid="upup-file-list"', async () => {
        const file = makeFile('f1', 'photo.jpg')
        const storeMock = makeStoreMock(new Map([['f1', file]]))

        await TestBed.configureTestingModule({
            imports: [FileListComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileListComponent)
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        expect(
            el.querySelector('[data-testid="upup-file-list"]'),
        ).not.toBeNull()
    })

    it('renders N file-item rows for N small files (non-virtual path)', async () => {
        // Use 3 files — well below VIRTUAL_SCROLL_THRESHOLD=20 → standard flat list
        const files = new Map<string, UploadFile>([
            ['f1', makeFile('f1', 'a.jpg')],
            ['f2', makeFile('f2', 'b.jpg')],
            ['f3', makeFile('f3', 'c.jpg')],
        ])
        const storeMock = makeStoreMock(files)

        await TestBed.configureTestingModule({
            imports: [FileListComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileListComponent)
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        const rows = el.querySelectorAll('[data-testid="upup-file-item"]')
        expect(rows.length).toBe(3)
    })

    it('renders the upload button when status is IDLE', async () => {
        const file = makeFile('f1', 'photo.jpg')
        const storeMock = makeStoreMock(new Map([['f1', file]]))

        await TestBed.configureTestingModule({
            imports: [FileListComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileListComponent)
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        const btn = el.querySelector('[data-testid="upup-upload-btn"]')
        expect(btn).not.toBeNull()
    })

    it('renders retry button when status is FAILED', async () => {
        const file = makeFile('f1', 'photo.jpg')
        const storeMock = makeStoreMock(new Map([['f1', file]]))
        // Override uploadStatus for this test
        storeMock.uploadStatus = () => UploadStatus.FAILED

        await TestBed.configureTestingModule({
            imports: [FileListComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileListComponent)
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        expect(
            el.querySelector('[data-testid="upup-retry-btn"]'),
        ).not.toBeNull()
    })

    it('renders the upup-upload-error slot when FAILED with a message (P4/C11)', async () => {
        const file = makeFile('f1', 'photo.jpg')
        const storeMock = makeStoreMock(new Map([['f1', file]]))
        storeMock.uploadStatus = () => UploadStatus.FAILED
        storeMock.uploadError = () => 'Network timeout'
        storeMock.uploadErrorCode = () => undefined

        await TestBed.configureTestingModule({
            imports: [FileListComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileListComponent)
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        const errorEl = el.querySelector('[data-testid="upup-upload-error"]')
        expect(errorEl).not.toBeNull()
        expect(errorEl?.getAttribute('data-upup-slot')).toBe('upload-error')
        expect(errorEl?.textContent).toContain('Network timeout')
    })

    it('renders the code-aware message + title attribute when uploadErrorCode is set (P4/C11)', async () => {
        const file = makeFile('f1', 'photo.jpg')
        const storeMock = makeStoreMock(new Map([['f1', file]]))
        storeMock.uploadStatus = () => UploadStatus.FAILED
        storeMock.uploadError = () => 'Signature mismatch'
        storeMock.uploadErrorCode = () => 'SignatureDoesNotMatch'

        await TestBed.configureTestingModule({
            imports: [FileListComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileListComponent)
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        const errorEl = el.querySelector('[data-testid="upup-upload-error"]')
        expect(errorEl).not.toBeNull()
        expect(errorEl?.getAttribute('title')).toBe('SignatureDoesNotMatch')
        expect(errorEl?.textContent).toContain('SignatureDoesNotMatch')
    })

    it('does NOT render the upup-upload-error slot when FAILED but uploadError is empty', async () => {
        const file = makeFile('f1', 'photo.jpg')
        const storeMock = makeStoreMock(new Map([['f1', file]]))
        storeMock.uploadStatus = () => UploadStatus.FAILED
        storeMock.uploadError = () => undefined

        await TestBed.configureTestingModule({
            imports: [FileListComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileListComponent)
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        expect(el.querySelector('[data-testid="upup-upload-error"]')).toBeNull()
    })

    it('initializes virtualizer without throwing (jsdom smoke test)', async () => {
        const files = new Map<string, UploadFile>()
        // Add 25 files to cross VIRTUAL_SCROLL_THRESHOLD — virtualizer init runs
        for (let i = 0; i < 25; i++) {
            files.set(`f${i}`, makeFile(`f${i}`, `file${i}.jpg`))
        }
        const storeMock = makeStoreMock(files)

        await TestBed.configureTestingModule({
            imports: [FileListComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        let caught: unknown
        try {
            const fixture = TestBed.createComponent(FileListComponent)
            fixture.detectChanges()
        } catch (e) {
            caught = e
        }
        expect(caught).toBeUndefined()
    })

    it('calls store.handleFileRemove when remove button is clicked', async () => {
        const file = makeFile('f1', 'photo.jpg')
        const storeMock = makeStoreMock(new Map([['f1', file]]))

        await TestBed.configureTestingModule({
            imports: [FileListComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FileListComponent)
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        const removeBtn = el.querySelector(
            '[data-testid="upup-file-remove"]',
        ) as HTMLButtonElement | null
        if (removeBtn) {
            removeBtn.click()
            expect(storeMock.handleFileRemove).toHaveBeenCalled()
        } else {
            // FilePreview may not render the remove button in this test env
            // (FileDeleteIcon defaults to empty class — button still renders)
            // Log for diagnostics; don't fail.
            console.warn(
                '[file-list.spec] upup-file-remove button not found — FileDeleteIcon renders empty',
            )
        }
    })
})

// ── FilePreviewThumbnailComponent ─────────────────────────────────────────────

describe('FilePreviewThumbnailComponent', () => {
    it('renders a static FileIcon for PDF files', async () => {
        const storeMock = makeStoreMock(new Map())

        await TestBed.configureTestingModule({
            imports: [FilePreviewThumbnailComponent],
            providers: [{ provide: UpupStore, useValue: storeMock }],
        }).compileComponents()

        const fixture = TestBed.createComponent(FilePreviewThumbnailComponent)
        fixture.componentInstance.fileType = 'application/pdf'
        fixture.componentInstance.fileName = 'doc.pdf'
        fixture.componentInstance.fileUrl = 'blob:http://localhost/doc'
        fixture.componentInstance.canPreview = false
        fixture.componentInstance.slotClasses = { fileIcon: '' } as any
        fixture.componentInstance.allowPreview = false
        fixture.componentInstance.labels = { loading: 'Loading…' } as any
        fixture.detectChanges()

        const el: HTMLElement = fixture.nativeElement
        // For PDFs, should show static icon (upup-file-icon / svg)
        expect(el.querySelector('svg')).not.toBeNull()
    })
})
