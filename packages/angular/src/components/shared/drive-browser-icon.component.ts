import { Component, Input, inject } from '@angular/core'
import { type DriveFile } from '@useupup/core'
import { b64EncodeUnicode } from '@useupup/core/internal'
import { UpupStore } from '../../upup-store.service'
import { FolderIconComponent } from '../icons/folder-icon.component'
import { FileIconSvgComponent } from '../icons/file-icon-svg.component'

/**
 * Angular port of DriveBrowserIcon.svelte.
 *
 * Renders a folder icon, a file icon, or the drive thumbnail image for a DriveFile.
 * Falls back to an inline SVG data-URI when the thumbnail image fails to load.
 */
@Component({
    selector: 'upup-drive-browser-icon',
    standalone: true,
    imports: [FolderIconComponent, FileIconSvgComponent],
    template: `
        @if (file.isFolder) {
            <i class="upup-flex-grow upup-text-lg">
                <upup-folder-icon [class]="folderIconClass" />
            </i>
        } @else if (!file.thumbnail) {
            <i class="upup-flex-grow upup-text-lg">
                <upup-file-icon-svg [class]="fileIconClass" />
            </i>
        } @else {
            <img
                [src]="file.thumbnail"
                [alt]="file.name"
                class="upup-h-5 upup-w-5 upup-flex-grow upup-rounded-md upup-shadow"
                (error)="handleImgError($event)"
            />
        }
    `,
})
export class DriveBrowserIconComponent {
    private store = inject(UpupStore)

    @Input({ required: true }) file!: DriveFile

    get folderIconClass(): string {
        return this.store.isDark()
            ? 'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]'
            : ''
    }

    get fileIconClass(): string {
        return this.store.isDark()
            ? 'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]'
            : ''
    }

    handleImgError(e: Event): void {
        const img = e.target as HTMLImageElement
        const svg = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path></svg>`
        img.src = `data:image/svg+xml;base64,${b64EncodeUnicode(svg)}`
        img.onerror = null
    }
}
