import { Component, Input, inject } from '@angular/core'
import { type DriveFile, cn } from '@upup/core'
import { UpupStore } from '../../upup-store.service'
import { DriveBrowserIconComponent } from './drive-browser-icon.component'

/**
 * Angular port of DriveBrowserItem.svelte.
 *
 * Renders a single drive file/folder row. Clicking calls handleClick.
 * Highlights selected files. Preserves data-upup-slot="drive-browser-item".
 */
@Component({
    selector: 'upup-drive-browser-item',
    standalone: true,
    imports: [DriveBrowserIconComponent],
    template: `
        <div
            data-upup-slot="drive-browser-item"
            [class]="containerClass"
            (click)="handleClick(file)"
        >
            <div [class]="innerClass">
                <upup-drive-browser-icon [file]="file" />
                <h1 [class]="textClass">{{ file.name }}</h1>
            </div>
        </div>
    `,
})
export class DriveBrowserItemComponent {
    private store = inject(UpupStore)

    @Input({ required: true }) file!: DriveFile
    @Input({ required: true }) handleClick!: (file: DriveFile) => void
    @Input({ required: true }) selectedFiles!: DriveFile[]

    get isFolder(): boolean {
        return !!this.file.isFolder
    }

    get isFileSelected(): boolean {
        return this.selectedFiles.some(f => f.id === this.file.id)
    }

    get containerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        const parts: string[] = [
            'upup-hover:bg-[#bab4b499] upup-group upup-mb-1 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-md upup-p-1 upup-py-2 upup-transition-colors upup-duration-150',
        ]
        if (this.isFolder) parts.push('upup-font-medium')
        if (this.isFileSelected) {
            parts.push('upup-bg-[#bab4b499]')
            if (slotClasses.driveItemContainerSelected)
                parts.push(slotClasses.driveItemContainerSelected)
        } else {
            parts.push('upup-bg-[#e9ecef00]')
            if (slotClasses.driveItemContainerDefault)
                parts.push(slotClasses.driveItemContainerDefault)
        }
        return parts.join(' ')
    }

    get innerClass(): string {
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-flex upup-items-center upup-gap-2',
            slotClasses.driveItemContainerInner,
        )
    }

    get textClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-text-wrap upup-break-all upup-text-xs',
            dark ? 'upup-text-[#e0e0e0] dark:upup-text-[#e0e0e0]' : '',
            slotClasses.driveItemInnerText,
        )
    }
}
