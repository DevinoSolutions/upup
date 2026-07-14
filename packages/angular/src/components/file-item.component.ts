import { Component, Input, inject } from '@angular/core'
import { cn } from '@upupjs/core/internal'
import type { UploadFile } from '@upupjs/core'
import { UpupStore } from '../upup-store.service'
import { FilePreviewComponent } from './file-preview.component'
import { FilePreviewPortalComponent } from './file-preview-portal.component'

/**
 * FileItem — port of FileItem.svelte.
 *
 * Wraps FilePreview + conditionally renders FilePreviewPortal (overlay).
 * Manages local canPreview / showPreviewPortal state.
 *
 * data-testid="upup-file-item" / data-upup-slot="file-item" preserved.
 */
@Component({
    selector: 'upup-file-item',
    standalone: true,
    imports: [FilePreviewComponent, FilePreviewPortalComponent],
    template: `
        <div
            data-testid="upup-file-item"
            data-upup-slot="file-item"
            [class]="containerClass"
        >
            <upup-file-preview
                [fileName]="file.name"
                [fileType]="file.type ?? ''"
                [fileId]="file.id"
                [fileUrl]="file.url ?? ''"
                [fileSize]="file.size"
                [canPreview]="canPreview"
                (updateCanPreview)="canPreview = $event"
                (onRequestPreview)="openPreviewPortal()"
                (onclick)="store.uiProps.onFileClick(file)"
            />

            @if (canPreview && showPreviewPortal) {
                <upup-file-preview-portal
                    [fileType]="file.type ?? ''"
                    [fileUrl]="file.url ?? ''"
                    [fileName]="file.name"
                    [fileSize]="file.size"
                    (onClose)="closePreviewPortal()"
                />
            }
        </div>
    `,
})
export class FileItemComponent {
    readonly store = inject(UpupStore)

    @Input() file!: UploadFile

    canPreview = false
    showPreviewPortal = false

    get containerClass(): string {
        const slotClasses = this.store.slotOverrides()
        const filesSize = this.store.files().size
        return cn(
            'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
            {
                [slotClasses.fileItemMultiple ?? '']:
                    !!slotClasses.fileItemMultiple && filesSize > 1,
                [slotClasses.fileItemSingle ?? '']:
                    !!slotClasses.fileItemSingle && filesSize === 1,
            },
        )
    }

    openPreviewPortal(): void {
        this.showPreviewPortal = true
        // core is null before init()/after destroy() — guard the runtime null
        // (the type is too narrow, so the no-unnecessary-condition warning is a false positive)
        this.store.core?.emit('file-preview-open', {
            fileId: this.file.id,
            fileName: this.file.name,
        })
    }

    closePreviewPortal(): void {
        this.showPreviewPortal = false
        this.store.core?.emit('file-preview-close', {
            fileId: this.file.id,
            fileName: this.file.name,
        })
    }
}
