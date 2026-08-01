import { Component, Input, inject } from '@angular/core'
import { cn } from '@upupjs/core/internal'
import type { UploadFile } from '@upupjs/core'
import { UpupStore } from '../upup-store.service'
import { FilePreviewComponent } from './file-preview.component'
import { FilePreviewPortalComponent } from './file-preview-portal.component'
import { FileRowComponent } from './file-row.component'

/**
 * FileItem — port of FileItem. Wraps the grid tile (FilePreview + preview portal)
 * or, in list / forced-list mode, the compact FileRow. Entrance/exit fx render
 * unconditionally (the CSS motion gate is the one kill switch); a leaving id
 * swaps in the collapse.
 *
 * data-testid="upup-file-item" / data-upup-slot="file-item" / role="listitem".
 */
@Component({
    selector: 'upup-file-item',
    standalone: true,
    imports: [
        FilePreviewComponent,
        FilePreviewPortalComponent,
        FileRowComponent,
    ],
    template: `
        <div
            data-testid="upup-file-item"
            data-upup-slot="file-item"
            role="listitem"
            [class]="containerClass"
            [style.animation-delay]="animationDelay"
        >
            @if (store.viewMode() === 'list' || forcedList) {
                <upup-file-row [file]="file" [index]="index" />
            } @else {
                <upup-file-preview
                    [fileName]="file.name"
                    [fileType]="file.type ?? ''"
                    [fileId]="file.id"
                    [fileUrl]="file.url ?? ''"
                    [fileSize]="file.size"
                    [index]="index"
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
            }
        </div>
    `,
})
export class FileItemComponent {
    readonly store = inject(UpupStore)

    @Input() file!: UploadFile
    /** Position in the sorted list — drives the entrance stagger / check stagger. */
    @Input() index = 0
    /** True when the panel forces the row list (tiles don't fit one row). */
    @Input() forcedList = false

    canPreview = false
    showPreviewPortal = false

    get leaving(): boolean {
        return this.store.leavingFileIds().has(this.file.id)
    }

    get animationDelay(): string | null {
        // Cap the stagger: in the virtualized branch `index` is unbounded.
        return this.leaving ? null : `${Math.min(this.index, 8) * 40}ms`
    }

    get containerClass(): string {
        const slotClasses = this.store.slotOverrides()
        const filesSize = this.store.files().size
        return cn(
            'upup-animate-fx-enter',
            'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
            this.leaving && 'upup-animate-fx-exit upup-overflow-hidden',
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
