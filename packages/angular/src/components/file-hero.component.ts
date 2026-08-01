import { Component, Input, inject, type Type } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { UploadStatus, type UploadFile, type Translations } from '@upupjs/core'
import { cn, fileGetIsImage, fileGetExtension } from '@upupjs/core/internal'
import { UpupStore } from '../upup-store.service'
import { FileIconComponent } from './file-icon.component'
import { ProgressBarComponent } from './progress-bar.component'
import { FileSuccessCheckComponent } from './shared/file-success-check.component'

/**
 * Single-file HERO preview (port of FileHero). One visual fills the fixed-height
 * content area with a bottom scrim caption. The panel is fixed-height by ruling,
 * so the media MUST stay bounded with `min-h-0 flex-1 object-contain`.
 *
 * The image editor is react/preact-only, so NO edit affordance is rendered here.
 */
@Component({
    selector: 'upup-file-hero',
    standalone: true,
    imports: [
        NgComponentOutlet,
        FileIconComponent,
        ProgressBarComponent,
        FileSuccessCheckComponent,
    ],
    template: `
        <div
            data-testid="upup-file-hero"
            data-upup-slot="file-hero"
            role="listitem"
            [class]="rootClass"
        >
            @if (isImage) {
                <img
                    [src]="file.url ?? ''"
                    [alt]="file.name"
                    class="upup-min-h-0 upup-flex-1 upup-object-contain"
                />
            } @else if (isVideo) {
                <video
                    [src]="file.url ?? ''"
                    muted
                    playsinline
                    preload="metadata"
                    class="upup-pointer-events-none upup-min-h-0 upup-flex-1 upup-object-contain"
                ></video>
            } @else {
                <div
                    class="upup-flex upup-min-h-0 upup-flex-1 upup-items-center upup-justify-center upup-bg-gradient-to-br upup-from-[#0ea5e9]/10 upup-to-[#7c3aed]/10"
                >
                    <upup-file-icon [extension]="extension" />
                </div>
            }

            @if (isSuccessful) {
                <upup-file-success-check
                    className="upup-absolute upup-left-3 upup-top-3 upup-z-10"
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

            <div [class]="captionClass">
                <div [class]="nameClass">{{ file.name }}</div>
                <div [class]="sizeClass">{{ formattedSize }}</div>
                <upup-progress-bar
                    [className]="heroProgressClass"
                    progressBarClassName="upup-rounded"
                    [progress]="progress"
                    [showValue]="true"
                />
            </div>
        </div>
    `,
})
export class FileHeroComponent {
    readonly store = inject(UpupStore)

    @Input() file!: UploadFile

    readonly deleteIconInputs = { class: 'upup-h-5 upup-w-5' }

    get translations(): Translations {
        return this.store.translations()
    }

    get isImage(): boolean {
        return fileGetIsImage(this.file.type ?? '')
    }

    get isVideo(): boolean {
        return (this.file.type ?? '').startsWith('video/')
    }

    get isSuccessful(): boolean {
        return this.file.status === UploadStatus.SUCCESSFUL
    }

    get extension(): string {
        return fileGetExtension(this.file.type ?? '', this.file.name)
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

    get rootClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-relative upup-flex upup-min-h-0 upup-flex-1 upup-flex-col upup-overflow-hidden upup-rounded-2xl upup-ring-1',
            dark
                ? 'upup-bg-white/[0.03] upup-ring-white/[0.08]'
                : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
        )
    }

    get removeButtonClass(): string {
        return cn(
            'upup-fx-remove upup-fx-press upup-absolute upup-right-3 upup-top-3 upup-z-10',
            'upup-flex upup-h-[34px] upup-w-[34px] upup-items-center upup-justify-center',
            'upup-rounded-[9px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
            'hover:upup-bg-[#04080f]/65',
            'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
        )
    }

    get captionClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-pointer-events-none upup-absolute upup-inset-x-0 upup-bottom-0 upup-bg-gradient-to-t upup-to-transparent upup-px-[18px] upup-pb-3.5 upup-pt-4',
            dark
                ? 'upup-from-[#04080f]/[0.86] upup-via-[#04080f]/50'
                : 'upup-from-white/[0.92] upup-via-white/60',
        )
    }

    get nameClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-truncate upup-text-[13px] upup-font-semibold',
            dark ? 'upup-text-[#e2e8f0]' : 'upup-text-[#1e293b]',
        )
    }

    get sizeClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-mt-0.5 upup-text-[12px]',
            dark ? 'upup-text-[#94a3b8]' : 'upup-text-[#64748b]',
        )
    }

    get heroProgressClass(): string {
        const dark = this.store.isDark()
        return cn('upup-mt-2', dark ? 'upup-text-white' : 'upup-text-[#0f172a]')
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
