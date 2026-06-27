import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges, Type } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { DomSanitizer, type SafeStyle } from '@angular/platform-browser'
import {
    fileCanPreviewText,
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
    cn,
    type Translations,
} from '@upup/core'
import type { UploadFile } from '@upup/core'
import { UpupStore } from '../upup-store.service'
import { ShouldRenderComponent } from './should-render.component'
import { ProgressBarComponent } from './progress-bar.component'
import { FilePreviewThumbnailComponent } from './file-preview-thumbnail.component'

/**
 * FilePreview — port of FilePreview.svelte.
 *
 * Renders the thumbnail card for a single file: thumbnail (via FilePreviewThumbnail),
 * delete/edit-image buttons, progress bar, file name/size, and a "click to preview" button.
 *
 * data-testid="upup-file-preview" / data-upup-slot="file-preview" preserved.
 * data-testid="upup-file-remove" on the delete button preserved.
 */
@Component({
    selector: 'upup-file-preview',
    standalone: true,
    imports: [ShouldRenderComponent, ProgressBarComponent, FilePreviewThumbnailComponent, NgComponentOutlet],
    template: `
        <div
            class="upup-inline-block"
            [class]="rootClass"
            data-testid="upup-file-preview"
            data-upup-slot="file-preview"
            role="button"
            tabindex="0"
            (click)="onclick.emit($event)"
            (keydown)="onKeyDown($event)"
        >
            <div [class]="thumbnailWrapperClass" [style]="thumbnailBgStyle">
                <!-- Thumbnail (image bg or object preview).
                     Non-images render the thumbnail centered inside the card;
                     images show via the background-image on the wrapper above.
                     Mirrors FilePreview in react/vue/svelte/vanilla (ShouldRender
                     !isImage + the h-full/items-center/justify-center/p-6 wrapper)
                     so the static doc icon is vertically centered, not top-aligned. -->
                <upup-should-render [when]="!isImage">
                    <div class="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-6">
                        <upup-file-preview-thumbnail
                            [canPreview]="canPreview"
                            [fileType]="fileType"
                            [fileName]="fileName"
                            [fileUrl]="fileUrl"
                            [fileSize]="fileSize"
                            [slotClasses]="store.slotOverrides()"
                            [allowPreview]="store.uiProps.allowPreview"
                            [labels]="translations"
                            (updateCanPreview)="onUpdateCanPreview($event)"
                        />
                    </div>
                </upup-should-render>

                <!-- Edit-image button (only for images with editor enabled) -->
                @if (isImage && store.uiProps.imageEditor.enabled) {
                    <button
                        class="upup-absolute upup-right-1.5 upup-top-8 upup-z-10 upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center upup-rounded-full upup-bg-white upup-text-blue-600 upup-shadow-sm hover:upup-bg-white hover:upup-text-blue-700 upup-ring-1 upup-ring-black/5 disabled:upup-cursor-not-allowed disabled:upup-opacity-50"
                        (click)="onHandleEditImage($event)"
                        type="button"
                        [disabled]="!!progress"
                        [attr.aria-label]="translations.editImage"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            class="upup-h-3 upup-w-3"
                            aria-hidden="true"
                        >
                            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                        </svg>
                    </button>
                }

                <!-- Delete / remove button -->
                <button
                    [class]="deleteButtonClass"
                    (click)="onHandleFileRemove($event)"
                    type="button"
                    [disabled]="!!progress"
                    [attr.aria-label]="translations.removeFile"
                    data-testid="upup-file-remove"
                >
                    <ng-container [ngComponentOutlet]="fileDeleteIcon" />
                </button>

                <!-- Upload progress bar. Gated on progress so the idle DOM has no
                     progress node — React's <ProgressBar> returns null at progress 0,
                     but an Angular component host always renders, so without @if the
                     empty <upup-progress-bar> host would break DOM parity. -->
                @if (progress) {
                    <upup-progress-bar
                        class="upup-absolute upup-bottom-0 upup-left-0 upup-right-0"
                        progressBarClassName="upup-rounded-t-none upup-rounded-b-md"
                        [progress]="progress"
                    />
                }
            </div>

            <!-- Name + size + preview button -->
            <div class="upup-mt-1 upup-px-0.5">
                <div [class]="nameClass">{{ fileName }}</div>
                <div [class]="sizeClass">{{ formattedSize }}</div>

                @if (store.uiProps.allowPreview && canPreview) {
                    <button
                        type="button"
                        [class]="previewButtonClass"
                        (click)="onRequestPreview.emit()"
                    >
                        {{ translations.clickToPreview }}
                    </button>
                }
            </div>
        </div>
    `,
})
export class FilePreviewComponent implements OnChanges {
    readonly store = inject(UpupStore)
    private sanitizer = inject(DomSanitizer)

    @Input() fileName: string = ''
    @Input() fileType: string = ''
    @Input() fileId: string = ''
    @Input() fileUrl: string = ''
    @Input() fileSize?: number
    @Input() canPreview: boolean = false

    @Output() requestPreview = new EventEmitter<void>()
    @Output() onRequestPreview = new EventEmitter<void>()
    @Output() updateCanPreview = new EventEmitter<boolean>()
    @Output() onclick = new EventEmitter<MouseEvent>()

    // ── derived getters ───────────────────────────────────────────────────────

    get translations(): Translations {
        return this.store.translations()
    }

    get isImage(): boolean {
        return fileGetIsImage(this.fileType)
    }

    get isPdf(): boolean {
        return fileGetIsPdf(this.fileType, this.fileName)
    }

    get isText(): boolean {
        return fileGetIsText(this.fileType, this.fileName)
    }

    get canPreviewText(): boolean {
        return fileCanPreviewText(this.fileType, this.fileName, this.fileSize)
    }

    get progress(): number {
        const map = this.store.filesProgressMap()
        const entry = map[this.fileId]
        if (!entry || !entry.total) return 0
        return Math.floor((entry.loaded / entry.total) * 100)
    }

    get fileDeleteIcon(): Type<unknown> {
        return this.store.uiProps.icons.FileDeleteIcon as Type<unknown>
    }

    get isDark(): boolean {
        return this.store.isDark()
    }

    get rootClass(): string {
        const themeSlots = this.store.slots()
        return (themeSlots as any)?.filePreview?.root ?? ''
    }

    get thumbnailWrapperClass(): string {
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        const filesSize = this.store.files().size
        return cn(
            'upup-relative upup-h-[145px] upup-w-[145px] upup-overflow-hidden upup-rounded-lg upup-bg-white upup-shadow-sm',
            'upup-bg-contain upup-bg-center upup-bg-no-repeat',
            {
                [slotClasses.fileThumbnailMultiple ?? '']: !!slotClasses.fileThumbnailMultiple && filesSize > 1,
                [slotClasses.fileThumbnailSingle ?? '']: !!slotClasses.fileThumbnailSingle && filesSize === 1,
            },
            (themeSlots as any)?.filePreview?.thumbnail ?? '',
        )
    }

    get deleteButtonClass(): string {
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return cn(
            'upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
            'upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center',
            'upup-rounded-full upup-bg-white upup-text-red-600 upup-shadow-sm',
            'hover:upup-bg-white hover:upup-text-red-700',
            'upup-ring-1 upup-ring-black/5',
            'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
            slotClasses.fileDeleteButton ?? '',
            (themeSlots as any)?.filePreview?.deleteButton ?? '',
        )
    }

    get nameClass(): string {
        const dark = this.isDark
        const themeSlots = this.store.slots()
        return cn(
            'upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-gray-900',
            dark ? 'upup-text-white' : '',
            (themeSlots as any)?.filePreview?.name ?? '',
        )
    }

    get sizeClass(): string {
        const dark = this.isDark
        const themeSlots = this.store.slots()
        return cn(
            'upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-500',
            dark ? 'upup-text-gray-400' : '',
            (themeSlots as any)?.filePreview?.size ?? '',
        )
    }

    get previewButtonClass(): string {
        const dark = this.isDark
        const themeSlots = this.store.slots()
        return cn(
            'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#2563eb] upup-transition-all hover:upup-text-blue-700 hover:upup-underline',
            dark ? 'upup-text-[#4A9EFF] hover:upup-text-blue-300' : '',
            (themeSlots as any)?.filePreview?.previewButton ?? '',
        )
    }

    get formattedSize(): string {
        const tr = this.translations
        const bytes = this.fileSize
        if (!bytes || bytes === 0) return tr.zeroBytes
        const k = 1024
        const sizes = [tr.bytes, tr.kb, tr.mb, tr.gb]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`
    }

    get thumbnailBgStyle(): SafeStyle | null {
        // Mirrors svelte FilePreview.svelte: style={isImage ? `background-image: url(${fileUrl})` : undefined}
        // Angular's style sanitizer strips url(blob:…) values, so bypass to keep the bg image.
        if (!this.isImage) return null
        return this.sanitizer.bypassSecurityTrustStyle(`background-image: url(${this.fileUrl})`)
    }

    // ── lifecycle ─────────────────────────────────────────────────────────────

    ngOnChanges(changes: SimpleChanges): void {
        // Auto-signal canPreview when the file type/name changes
        if (changes['fileType'] || changes['fileName'] || changes['fileSize']) {
            this.checkAndSignalCanPreview()
        }
    }

    // ── methods ───────────────────────────────────────────────────────────────

    private checkAndSignalCanPreview(): void {
        const should = this.isImage || this.isPdf || (this.isText && this.canPreviewText)
        if (should && !this.canPreview) {
            // Defer to next microtask to avoid NG0100 ExpressionChangedAfterItHasBeenChecked —
            // ngOnChanges fires during parent's change detection cycle; emitting synchronously
            // would mutate parent state that Angular has already snapshotted for this cycle.
            queueMicrotask(() => this.updateCanPreview.emit(true))
        }
    }

    onUpdateCanPreview(val: boolean): void {
        this.updateCanPreview.emit(val)
    }

    onHandleFileRemove(e: MouseEvent): void {
        e.stopPropagation()
        this.store.handleFileRemove(this.fileId)
    }

    onHandleEditImage(e: MouseEvent): void {
        e.stopPropagation()
        const file = this.store.files().get(this.fileId)
        if (file) this.store.openImageEditor(file)
    }

    onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter' || e.key === ' ') {
            this.onclick.emit(new MouseEvent('click'))
        }
    }
}
