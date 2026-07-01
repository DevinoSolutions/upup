import { Component, inject } from '@angular/core'
import { cn, FileSource } from '@upup/core'
import { UpupStore } from '../upup-store.service'
import { UrlUploaderComponent } from './url-uploader.component'
import { CameraUploaderComponent } from './camera-uploader.component'
import { AudioUploaderComponent } from './audio-uploader.component'
import { ScreenCaptureUploaderComponent } from './screen-capture-uploader.component'
import { GoogleDriveUploaderComponent } from './google-drive-uploader.component'
import { OneDriveUploaderComponent } from './onedrive-uploader.component'
import { DropboxUploaderComponent } from './dropbox-uploader.component'
import { BoxUploaderComponent } from './box-uploader.component'
import { ImageEditorStubComponent } from './image-editor-stub.component'
import {
    GoogleDriveIconComponent,
    OneDriveIconComponent,
    DropBoxIconComponent,
    BoxIconComponent,
    LinkIconComponent,
    CameraIconComponent,
    AudioIconComponent,
    ScreenCastIconComponent,
} from './icons'
import { DefaultLoaderIconComponent } from './icons'
import { NgComponentOutlet } from '@angular/common'

/**
 * SourceView — Angular port of SourceView.svelte.
 *
 * Renders the active adapter's view when store.activeAdapter() is set and
 * store.uiProps.mini is false. Mirrors svelte's shouldRender check:
 *   shouldRender = !!activeComponent && !mini && !!activeAdapter && !!AdapterIcon
 *
 * Active-adapter switch map:
 *   url        → UrlUploaderComponent
 *   camera     → CameraUploaderComponent
 *   microphone → AudioUploaderComponent
 *   screen     → ScreenCaptureUploaderComponent
 *   googleDrive → GoogleDriveUploaderComponent (client/server wrapper)
 *   oneDrive   → OneDriveUploaderComponent (client/server wrapper)
 *   dropbox    → DropboxUploaderComponent (client/server wrapper)
 *   box        → BoxUploaderComponent (client/server wrapper)
 *
 * The image editor stub is shown when store.editingFile() is set.
 *
 * data-upup-slot="adapter-view" is on the outer div (parity with svelte).
 */
@Component({
    selector: 'upup-adapter-view',
    standalone: true,
    imports: [
        NgComponentOutlet,
        UrlUploaderComponent,
        CameraUploaderComponent,
        AudioUploaderComponent,
        ScreenCaptureUploaderComponent,
        GoogleDriveUploaderComponent,
        OneDriveUploaderComponent,
        DropboxUploaderComponent,
        BoxUploaderComponent,
        ImageEditorStubComponent,
        GoogleDriveIconComponent,
        OneDriveIconComponent,
        DropBoxIconComponent,
        BoxIconComponent,
        LinkIconComponent,
        CameraIconComponent,
        AudioIconComponent,
        ScreenCastIconComponent,
        DefaultLoaderIconComponent,
    ],
    template: `
        @if (shouldRender) {
            <div
                class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
                data-upup-slot="adapter-view"
            >
                <!-- Header row with icon + cancel -->
                <div [class]="headerClass">
                    @switch (store.activeAdapter()) {
                        @case ('googleDrive') { <upup-google-drive-icon /> }
                        @case ('oneDrive') { <upup-onedrive-icon /> }
                        @case ('dropbox') { <upup-dropbox-icon /> }
                        @case ('box') { <upup-box-icon /> }
                        @case ('url') { <upup-link-icon /> }
                        @case ('camera') { <upup-camera-icon /> }
                        @case ('microphone') { <upup-audio-icon /> }
                        @case ('screen') { <upup-screencast-icon /> }
                    }
                    <button
                        [class]="cancelBtnClass"
                        (click)="handleCancel()"
                        type="button"
                    >
                        {{ store.translations().cancel }}
                    </button>
                </div>

                <!-- Content row: the active adapter component -->
                <div class="upup-overflow-hidden">
                    @switch (store.activeAdapter()) {
                        @case ('url') {
                            <upup-url-uploader />
                        }
                        @case ('camera') {
                            <upup-camera-uploader />
                        }
                        @case ('microphone') {
                            <upup-audio-uploader />
                        }
                        @case ('screen') {
                            <upup-screen-capture-uploader />
                        }
                        @case ('googleDrive') {
                            <upup-google-drive-uploader />
                        }
                        @case ('oneDrive') {
                            <upup-onedrive-uploader />
                        }
                        @case ('dropbox') {
                            <upup-dropbox-uploader />
                        }
                        @case ('box') {
                            <upup-box-uploader />
                        }
                    }
                </div>
            </div>
        }

        @if (store.editingFile()) {
            <upup-image-editor-stub />
        }
    `,
})
export class SourceViewComponent {
    readonly store = inject(UpupStore)

    /** Mirror svelte: shouldRender = !!activeComponent && !mini && !!activeAdapter */
    get shouldRender(): boolean {
        const active = this.store.activeAdapter()
        const mini = this.store.uiProps.mini
        return !!active && !mini
    }

    get headerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-shadow-bottom upup-flex upup-items-center upup-justify-between',
            'upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#1b5dab]',
            dark
                ? 'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]'
                : '',
            slotClasses.sourceViewHeader ?? '',
        )
    }

    get cancelBtnClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-rounded-md upup-p-1 upup-text-blue-600 upup-transition-all upup-duration-300',
            dark ? 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]' : '',
            slotClasses.sourceViewCancelButton ?? '',
        )
    }

    handleCancel(): void {
        this.store.setActiveAdapter(undefined)
    }
}
