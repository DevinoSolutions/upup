import { Component, Input, inject, type Type } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { DomSanitizer, type SafeStyle } from '@angular/platform-browser'
import {
    UploadStatus,
    fileTypeIconName,
    type IconName,
    type UploadFile,
    type Translations,
} from '@upupjs/core'
import { cn, fileGetIsImage, fileGetExtension } from '@upupjs/core/internal'
import { UpupStore } from '../upup-store.service'
import { IconComponent } from './icon.component'
import { ProgressBarComponent } from './progress-bar.component'
import { FileSuccessCheckComponent } from './shared/file-success-check.component'

const ARCHIVE_EXTENSIONS = new Set([
    'zip',
    'rar',
    '7z',
    'tar',
    'gz',
    'bz2',
    'xz',
])

interface NonMediaThumb {
    gradient: string
    icon: IconName | 'audio'
}

/**
 * Compact list-mode row (port of FileRow): a horizontal card — thumbnail ·
 * name/size · remove. Real image/video first-frame thumbs; colored non-media
 * type tiles via the core fileTypeIconName registry. No edit affordance (the
 * image editor is react/preact-only).
 */
@Component({
    selector: 'upup-file-row',
    standalone: true,
    imports: [
        NgComponentOutlet,
        IconComponent,
        ProgressBarComponent,
        FileSuccessCheckComponent,
    ],
    template: `
        <div [class]="rowClass">
            <div
                class="upup-relative upup-flex upup-h-10 upup-w-10 upup-flex-none upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-[9px] upup-bg-center upup-bg-cover upup-bg-no-repeat"
                [style]="thumbStyle"
            >
                @if (isVideo) {
                    <video
                        [src]="file.url ?? ''"
                        muted
                        playsinline
                        preload="metadata"
                        class="upup-pointer-events-none upup-absolute upup-inset-0 upup-h-full upup-w-full upup-object-cover"
                    ></video>
                }
                @if (!isImage && !isVideo) {
                    <upup-icon
                        [name]="thumb.icon"
                        [size]="20"
                        [class]="'upup-text-white'"
                    />
                }
            </div>

            <div
                class="upup-flex upup-min-w-0 upup-flex-1 upup-flex-col upup-gap-0.5"
            >
                <div [class]="nameClass">{{ file.name }}</div>
                <div [class]="sizeClass">{{ formattedSize }}</div>
                @if (!!progress) {
                    <upup-progress-bar
                        className="upup-mt-1"
                        progressBarClassName="upup-rounded"
                        [progress]="progress"
                        [showValue]="true"
                    />
                }
            </div>

            @if (isSuccessful) {
                <upup-file-success-check
                    [index]="index"
                    [size]="22"
                    className="upup-flex-none"
                />
            }

            @if (!isSuccessful) {
                <button
                    [class]="removeButtonClass"
                    (click)="onRemove($event)"
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
        </div>
    `,
})
export class FileRowComponent {
    readonly store = inject(UpupStore)
    private sanitizer = inject(DomSanitizer)

    @Input() file!: UploadFile
    @Input() index = 0

    readonly deleteIconInputs = { class: 'upup-h-5 upup-w-5' }

    get translations(): Translations {
        return this.store.translations()
    }

    get type(): string {
        return this.file.type ?? ''
    }

    get isImage(): boolean {
        return fileGetIsImage(this.type)
    }

    get isVideo(): boolean {
        return this.type.startsWith('video/')
    }

    get isSuccessful(): boolean {
        return this.file.status === UploadStatus.SUCCESSFUL
    }

    get thumb(): NonMediaThumb {
        const type = this.type
        const ext = fileGetExtension(type, this.file.name)
        if (type.startsWith('audio/'))
            return {
                gradient: 'linear-gradient(135deg,#a855f7,#6366f1)',
                icon: 'audio',
            }
        if (ext === 'pdf' || type === 'application/pdf')
            return {
                gradient: 'linear-gradient(135deg,#f43f5e,#ec4899)',
                icon: 'file-pdf',
            }
        if (ARCHIVE_EXTENSIONS.has(ext) || type.includes('zip'))
            return {
                gradient: 'linear-gradient(135deg,#f59e0b,#f97316)',
                icon: fileTypeIconName(ext === 'zip' ? 'zip' : ext),
            }
        return {
            gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
            icon: fileTypeIconName(ext),
        }
    }

    get thumbStyle(): SafeStyle | null {
        if (this.isImage)
            return this.sanitizer.bypassSecurityTrustStyle(
                `background-image: url(${this.file.url ?? ''})`,
            )
        if (this.isVideo) return null
        return this.sanitizer.bypassSecurityTrustStyle(
            `background: ${this.thumb.gradient}`,
        )
    }

    get progress(): number {
        const p = this.store.filesProgressMap()[this.file.id]
        const loaded = p?.loaded ?? NaN
        const total = p?.total ?? NaN
        const pct = Math.floor((loaded / total) * 100)
        return Number.isFinite(pct) ? pct : 0
    }

    get fileDeleteIcon(): Type<unknown> {
        return this.store.uiProps.icons.FileDeleteIcon as Type<unknown>
    }

    get rowClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-fx-hover-lift upup-flex upup-w-full upup-items-center upup-gap-3 upup-rounded-xl upup-px-3 upup-py-2.5 upup-ring-1',
            dark
                ? 'upup-bg-white/[0.04] upup-ring-white/[0.07]'
                : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
        )
    }

    get nameClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-truncate upup-text-[13px]',
            dark ? 'upup-text-[#e2e8f0]' : 'upup-text-gray-900',
        )
    }

    get sizeClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-text-[12px]',
            dark ? 'upup-text-[#94a3b8]' : 'upup-text-gray-500',
        )
    }

    get removeButtonClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-fx-remove upup-fx-press upup-flex upup-h-8 upup-w-8 upup-flex-none upup-items-center upup-justify-center upup-rounded-lg',
            dark
                ? 'upup-text-[#64748b] hover:upup-bg-white/[0.06]'
                : 'upup-text-gray-500 hover:upup-bg-black/[0.06]',
            'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
        )
    }

    get formattedSize(): string {
        const tr = this.translations
        const bytes = this.file.size
        if (!bytes || bytes === 0) return tr.zeroBytes
        const k = 1024
        const sizes = [tr.bytes, tr.kb, tr.mb, tr.gb]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`
    }

    onRemove(e: MouseEvent): void {
        e.stopPropagation()
        this.store.handleFileRemove(this.file.id)
    }
}
