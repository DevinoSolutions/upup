import {
    Component,
    Input,
    Output,
    EventEmitter,
    inject,
    OnChanges,
    SimpleChanges,
    type Type,
} from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { DomSanitizer, type SafeStyle } from '@angular/platform-browser'
import { UploadStatus, type Translations } from '@upupjs/core'
import {
    fileCanPreviewText,
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
    cn,
} from '@upupjs/core/internal'
import { UpupStore } from '../upup-store.service'
import { ProgressBarComponent } from './progress-bar.component'
import { FilePreviewThumbnailComponent } from './file-preview-thumbnail.component'
import { FileSuccessCheckComponent } from './shared/file-success-check.component'

/**
 * FilePreview — port of FilePreview. Grid-mode tile: thumbnail (image bg / video
 * first-frame / non-media doc icon), delete + completion overlays, progress bar,
 * name/size, and a click-to-preview button. No edit affordance (the image editor
 * is react/preact-only).
 *
 * data-testid="upup-file-preview" / data-upup-slot="file-preview" preserved.
 */
@Component({
    selector: 'upup-file-preview',
    standalone: true,
    imports: [
        ProgressBarComponent,
        FilePreviewThumbnailComponent,
        FileSuccessCheckComponent,
        NgComponentOutlet,
    ],
    template: `
        <div
            [class]="rootClass"
            data-testid="upup-file-preview"
            data-upup-slot="file-preview"
        >
            <div [class]="thumbnailWrapperClass" [style]="thumbnailBgStyle">
                <button
                    type="button"
                    [attr.aria-label]="fileName"
                    class="upup-absolute upup-inset-0 upup-z-0 upup-cursor-pointer"
                    (click)="onclick.emit($event)"
                ></button>

                @if (isVideo) {
                    <video
                        [src]="fileUrl"
                        muted
                        playsinline
                        preload="metadata"
                        class="upup-pointer-events-none upup-absolute upup-inset-0 upup-h-full upup-w-full upup-object-cover"
                    ></video>
                }
                @if (!isImage && !isVideo) {
                    <div
                        class="upup-flex upup-h-full upup-items-center upup-justify-center upup-p-6"
                    >
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
                }

                @if (!isSuccessful) {
                    <button
                        [class]="deleteButtonClass"
                        (click)="onHandleFileRemove($event)"
                        type="button"
                        [disabled]="!!progress"
                        [attr.aria-label]="translations.removeFile"
                        data-testid="upup-file-remove"
                    >
                        <ng-container
                            [ngComponentOutlet]="fileDeleteIcon"
                            [ngComponentOutletInputs]="deleteIconInputs"
                        />
                    </button>
                }

                @if (isSuccessful) {
                    <upup-file-success-check
                        [index]="index"
                        [size]="20"
                        className="upup-absolute upup-left-1.5 upup-top-1.5 upup-z-10"
                    />
                }

                <upup-progress-bar
                    [className]="'upup-absolute upup-bottom-0 upup-left-0 upup-right-0'"
                    progressBarClassName="upup-rounded-t-none upup-rounded-b-md"
                    [progress]="progress"
                />
            </div>

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
    @Input() index = 0

    @Output() onRequestPreview = new EventEmitter<void>()
    @Output() updateCanPreview = new EventEmitter<boolean>()
    @Output() onclick = new EventEmitter<MouseEvent>()

    readonly deleteIconInputs = { class: 'upup-h-5 upup-w-5' }

    get translations(): Translations {
        return this.store.translations()
    }

    get isImage(): boolean {
        return fileGetIsImage(this.fileType)
    }

    get isVideo(): boolean {
        return this.fileType.startsWith('video/')
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

    get isSuccessful(): boolean {
        return (
            this.store.files().get(this.fileId)?.status ===
            UploadStatus.SUCCESSFUL
        )
    }

    get progress(): number {
        const p = this.store.filesProgressMap()[this.fileId]
        const loaded = p?.loaded ?? NaN
        const total = p?.total ?? NaN
        const pct = Math.floor((loaded / total) * 100)
        return Number.isFinite(pct) ? pct : 0
    }

    get fileDeleteIcon(): Type<unknown> {
        return this.store.uiProps.icons.FileDeleteIcon as Type<unknown>
    }

    get rootClass(): string {
        const themeSlots = this.store.slots()
        return cn('upup-block upup-w-full', themeSlots.filePreview?.root ?? '')
    }

    get thumbnailWrapperClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        const filesSize = this.store.files().size
        return cn(
            'upup-fx-hover-lift upup-relative upup-h-[160px] upup-w-full upup-overflow-hidden upup-rounded-xl upup-ring-1',
            'upup-bg-contain upup-bg-center upup-bg-no-repeat',
            dark
                ? 'upup-bg-white/[0.055] upup-ring-white/[0.08]'
                : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
            {
                [slotClasses.fileThumbnailMultiple ?? '']:
                    !!slotClasses.fileThumbnailMultiple && filesSize > 1,
                [slotClasses.fileThumbnailSingle ?? '']:
                    !!slotClasses.fileThumbnailSingle && filesSize === 1,
            },
            themeSlots.filePreview?.thumbnail ?? '',
        )
    }

    get deleteButtonClass(): string {
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return cn(
            'upup-fx-remove upup-fx-press upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10',
            'upup-flex upup-h-[30px] upup-w-[30px] upup-items-center upup-justify-center',
            'upup-rounded-[8px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
            'hover:upup-bg-[#04080f]/65',
            'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
            slotClasses.fileDeleteButton ?? '',
            themeSlots.filePreview?.deleteButton ?? '',
        )
    }

    get nameClass(): string {
        const dark = this.store.isDark()
        const themeSlots = this.store.slots()
        return cn(
            'upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-gray-900',
            dark ? 'upup-text-white' : '',
            themeSlots.filePreview?.name ?? '',
        )
    }

    get sizeClass(): string {
        const dark = this.store.isDark()
        const themeSlots = this.store.slots()
        return cn(
            'upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-500',
            dark ? 'upup-text-gray-400' : '',
            themeSlots.filePreview?.size ?? '',
        )
    }

    get previewButtonClass(): string {
        const dark = this.store.isDark()
        const themeSlots = this.store.slots()
        return cn(
            'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#0284c7] upup-transition-all hover:upup-text-[#0284c7] hover:upup-underline',
            dark ? 'upup-text-[#38bdf8] hover:upup-text-[#7dd3fc]' : '',
            themeSlots.filePreview?.previewButton ?? '',
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
        if (!this.isImage) return null
        return this.sanitizer.bypassSecurityTrustStyle(
            `background-image: url(${this.fileUrl})`,
        )
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['fileType'] || changes['fileName'] || changes['fileSize']) {
            this.checkAndSignalCanPreview()
        }
    }

    private checkAndSignalCanPreview(): void {
        const should =
            this.isImage || this.isPdf || (this.isText && this.canPreviewText)
        if (should && !this.canPreview) {
            queueMicrotask(() => {
                this.updateCanPreview.emit(true)
            })
        }
    }

    onUpdateCanPreview(val: boolean): void {
        this.updateCanPreview.emit(val)
    }

    onHandleFileRemove(e: MouseEvent): void {
        e.stopPropagation()
        this.store.handleFileRemove(this.fileId)
    }
}
