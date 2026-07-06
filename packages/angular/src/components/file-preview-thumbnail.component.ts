import { Component, Input, Output, EventEmitter, inject } from '@angular/core'
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser'
import {
    fileGetExtension,
    fileGetIsPdf,
    fileGetIsText,
    fileIs3D,
    cn,
} from '@upup/core/internal'
import type { Translations } from '@upup/core'
import type { InternalFlatClassNames } from '@upup/core/internal'
import { FileIconComponent } from './file-icon.component'

/**
 * FilePreviewThumbnail — port of FilePreviewThumbnail.svelte.
 *
 * Decides whether to show a static icon (PDF / 3D / oversized text) or an
 * <object> preview element. Emits (updateCanPreview) when the object loads.
 *
 * Svelte original:
 *   {#if isPdf || is3D || isOversizedText()} → static icon
 *   {:else}
 *     {#if !canPreview} → hidden <object> + icon
 *     {#if canPreview}  → icon (hidden on md if allowPreview) + visible <object>
 */
@Component({
    selector: 'upup-file-preview-thumbnail',
    standalone: true,
    imports: [FileIconComponent],
    template: `
        @if (isStaticIcon) {
            <!-- PDFs, 3D files, and text → static icon -->
            <div class="upup-flex upup-flex-col upup-items-center upup-gap-2">
                <upup-file-icon
                    [extension]="extension"
                    [class]="slotClasses.fileIcon"
                />
            </div>
        } @else {
            <!-- Hidden object probe: fires (load) to signal canPreview=true -->
            @if (!canPreview) {
                <object
                    [data]="safeFileUrl"
                    width="0%"
                    height="0%"
                    [name]="fileName"
                    [title]="fileName"
                    [type]="fileType"
                    (load)="onObjectLoad()"
                >
                    <p>{{ labels.loading }}</p>
                </object>
                <upup-file-icon [extension]="extension" />
            }

            @if (canPreview) {
                <upup-file-icon
                    [extension]="extension"
                    [class]="iconWhenCanPreviewClass"
                />
                <div [class]="objectWrapperClass">
                    <object
                        [data]="safeFileUrl"
                        width="100%"
                        height="100%"
                        [name]="fileName"
                        [title]="fileName"
                        [type]="fileType"
                        class="upup-absolute upup-h-full upup-w-full"
                    >
                        <p>{{ labels.loading }}</p>
                    </object>
                </div>
            }
        }
    `,
})
export class FilePreviewThumbnailComponent {
    private sanitizer = inject(DomSanitizer)

    @Input() canPreview: boolean = false
    @Input() fileType: string = ''
    @Input() fileName: string = ''
    @Input() fileUrl: string = ''
    @Input() fileSize?: number
    @Input() slotClasses: InternalFlatClassNames = {}
    @Input() allowPreview: boolean = false
    @Input() labels: Translations = {} as Translations

    @Output() updateCanPreview = new EventEmitter<boolean>()

    get safeFileUrl(): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl)
    }

    // ── Derived getters ────────────────────────────────────────────────────────

    get extension(): string {
        return fileGetExtension(this.fileType, this.fileName)
    }

    get is3D(): boolean {
        return fileIs3D(this.extension.toLowerCase())
    }

    get isPdf(): boolean {
        return fileGetIsPdf(this.fileType, this.fileName)
    }

    // Text files render as a static doc icon (cross-framework parity).
    get isText(): boolean {
        return fileGetIsText(this.fileType, this.fileName)
    }

    get isStaticIcon(): boolean {
        return this.isPdf || this.is3D || this.isText
    }

    get iconWhenCanPreviewClass(): string {
        return cn(
            this.allowPreview ? 'md:upup-hidden' : '',
            this.slotClasses.fileIcon,
        )
    }

    get objectWrapperClass(): string {
        return cn(
            `upup-relative upup-hidden upup-h-full upup-w-full ${this.allowPreview ? 'md:upup-block' : ''}`,
        )
    }

    onObjectLoad(): void {
        this.updateCanPreview.emit(true)
    }
}
