import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, Type } from '@angular/core'
import { DomSanitizer, type SafeResourceUrl, type SafeUrl } from '@angular/platform-browser'
import {
    fileGetIsImage,
    fileGetIsPdf,
    fileGetIsText,
    fileCanPreviewText,
    cn,
    type Translations,
} from '@upup/core'
import { UpupStore } from '../upup-store.service'
import { ShouldRenderComponent } from './should-render.component'

const TEXT_PREVIEW_MAX_BYTES = 1024 * 1024 // 1 MB cap — mirrors svelte portal

/**
 * FilePreviewPortal — port of FilePreviewPortal.svelte.
 *
 * Svelte renders this into document.body via a portal action.
 * Here we use a fixed full-viewport overlay div toggled with @if — no CDK needed.
 * The `upup-scope` wrapper + `data-upup-slot="file-preview-portal"` testid are preserved.
 *
 * Backdrop click → onClose; Escape key → onClose; content click stops propagation.
 * Handles text loading/error/truncation (mirrors svelte portal).
 */
@Component({
    selector: 'upup-file-preview-portal',
    standalone: true,
    imports: [ShouldRenderComponent],
    template: `
        <!-- Fixed full-viewport overlay (portal equivalent) -->
        <div class="upup-scope" data-upup-slot="file-preview-portal">
            <div
                class="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/40"
                role="dialog"
                aria-modal="true"
                [attr.aria-label]="fileName"
                [attr.tabindex]="-1"
                (click)="onBackdropClick($event)"
                (keydown)="onKeyDown($event)"
            >
                <div class="upup-relative upup-h-[90vh] upup-w-[90vw] upup-p-4">
                    <div
                        [class]="innerClass"
                        role="presentation"
                        (click)="onContentClick($event)"
                    >
                        <!-- Close button -->
                        <button
                            type="button"
                            [attr.aria-label]="translations.cancel"
                            class="upup-absolute upup-right-3 upup-top-3 upup-z-10 upup-flex upup-size-8 upup-items-center upup-justify-center upup-rounded-full upup-bg-black/70 upup-text-sm upup-font-semibold upup-text-white upup-shadow-sm hover:upup-bg-black focus:upup-outline-none focus:upup-ring-2 focus:upup-ring-white"
                            (click)="onClose.emit()"
                        >
                            x
                        </button>

                        <!-- Image preview -->
                        <upup-should-render [when]="isImage">
                            <img
                                [src]="safeImgUrl"
                                [alt]="fileName"
                                class="upup-h-full upup-w-full upup-rounded upup-object-contain"
                            />
                        </upup-should-render>

                        <!-- PDF preview -->
                        <upup-should-render [when]="isPdf">
                            <embed
                                [src]="safeResourceUrl"
                                type="application/pdf"
                                width="100%"
                                height="100%"
                                class="upup-rounded"
                                [title]="fileName"
                            />
                        </upup-should-render>

                        <!-- Text / other preview -->
                        <upup-should-render [when]="!isImage && !isPdf">
                            <upup-should-render [when]="isText">
                                <div class="upup-h-full upup-w-full upup-overflow-auto upup-p-4 upup-font-mono upup-text-xs">
                                    @if (textLoading) {
                                        <p>{{ translations.loading }}</p>
                                    }
                                    @if (textError) {
                                        <p>{{ translations.previewError }} {{ textError }}</p>
                                    }
                                    @if (!textLoading && !textError) {
                                        <pre class="upup-whitespace-pre-wrap">{{ textContent }}</pre>
                                        @if (isTruncated) {
                                            <div class="upup-mt-4 upup-rounded upup-border upup-border-yellow-500/30 upup-bg-yellow-500/10 upup-px-3 upup-py-2 upup-text-xs upup-text-yellow-400">
                                                Content truncated - file is too large to preview in full.
                                            </div>
                                        }
                                    }
                                </div>
                            </upup-should-render>
                        </upup-should-render>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class FilePreviewPortalComponent implements OnInit, OnDestroy {
    readonly store = inject(UpupStore)
    private sanitizer = inject(DomSanitizer)

    @Input() fileType: string = ''
    @Input() fileUrl: string = ''
    @Input() fileName: string = ''
    @Input() fileSize?: number

    get safeImgUrl(): SafeUrl {
        return this.sanitizer.bypassSecurityTrustUrl(this.fileUrl)
    }

    get safeResourceUrl(): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl)
    }

    @Output() onClose = new EventEmitter<void>()
    @Output() onStopPropagation = new EventEmitter<MouseEvent>()

    // ── text preview state ────────────────────────────────────────────────────
    textLoading = false
    textError = ''
    textContent = ''
    isTruncated = false

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

    get isDark(): boolean {
        return this.store.isDark()
    }

    get innerClass(): string {
        const dark = this.isDark
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-absolute upup-inset-0 upup-m-4 upup-bg-white',
            dark ? 'upup-bg-[#232323] dark:upup-bg-[#232323]' : '',
            slotClasses.filePreviewPortal ?? '',
        )
    }

    // ── lifecycle ─────────────────────────────────────────────────────────────

    ngOnInit(): void {
        if (this.isText) {
            void this.loadTextContent()
        }
    }

    ngOnDestroy(): void {
        // nothing to tear down (no object URL created here)
    }

    // ── event handlers ────────────────────────────────────────────────────────

    onBackdropClick(e: MouseEvent): void {
        this.onClose.emit()
    }

    onContentClick(e: MouseEvent): void {
        e.stopPropagation()
    }

    onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') this.onClose.emit()
    }

    // ── text loading ──────────────────────────────────────────────────────────

    private async loadTextContent(): Promise<void> {
        if (!this.fileUrl) return
        this.textLoading = true
        this.textError = ''
        try {
            const response = await fetch(this.fileUrl)
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const blob = await response.blob()
            let text: string
            if (blob.size > TEXT_PREVIEW_MAX_BYTES) {
                const slice = blob.slice(0, TEXT_PREVIEW_MAX_BYTES)
                text = await slice.text()
                this.isTruncated = true
            } else {
                text = await blob.text()
                this.isTruncated = false
            }
            this.textContent = text
        } catch (err) {
            this.textError = err instanceof Error ? err.message : String(err)
        } finally {
            this.textLoading = false
        }
    }
}
