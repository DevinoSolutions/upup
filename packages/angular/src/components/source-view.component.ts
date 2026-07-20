import { Component, ElementRef, ViewChild, inject } from '@angular/core'
import { cn, sourceNameKeys } from '@upupjs/core/internal'
import { UpupStore } from '../upup-store.service'
import { SourceViewHeaderExtraService } from '../context/source-view-header-extra.service'
import { UrlUploaderComponent } from './url-uploader.component'
import { CameraUploaderComponent } from './camera-uploader.component'
import { AudioUploaderComponent } from './audio-uploader.component'
import { ScreenCaptureUploaderComponent } from './screen-capture-uploader.component'
import { GoogleDriveUploaderComponent } from './google-drive-uploader.component'
import { OneDriveUploaderComponent } from './one-drive-uploader.component'
import { DropboxUploaderComponent } from './dropbox-uploader.component'
import { BoxUploaderComponent } from './box-uploader.component'
import { ImageEditorStubComponent } from './image-editor-stub.component'
import {
    GoogleDriveIconComponent,
    OneDriveIconComponent,
    DropboxIconComponent,
    BoxIconComponent,
    LinkIconComponent,
    CameraIconComponent,
    AudioIconComponent,
    ScreenCaptureIconComponent,
} from './icons'
import { DefaultLoaderIconComponent } from './icons'
import { NgComponentOutlet } from '@angular/common'

/**
 * SourceView — Angular port of SourceView.svelte.
 *
 * Renders the active source's view when store.activeSource() is set and
 * store.uiProps.mini is false. Mirrors svelte's shouldRender check:
 *   shouldRender = !!activeComponent && !mini && !!activeSource && !!SourceIcon
 *
 * Active-source switch map:
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
 * data-upup-slot="source-view" is on the outer div (parity with svelte).
 */
@Component({
    selector: 'upup-source-view',
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
        DropboxIconComponent,
        BoxIconComponent,
        LinkIconComponent,
        CameraIconComponent,
        AudioIconComponent,
        ScreenCaptureIconComponent,
        DefaultLoaderIconComponent,
    ],
    template: `
        @if (shouldRender) {
            <div
                class="upup-animate-fx-view upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
                data-upup-slot="source-view"
            >
                <!-- Transparent header on the panel gradient (no inner box): the
                     provider icon + name fill the row; "Back" returns to sources. -->
                <div [class]="headerClass">
                    <span class="upup-flex upup-items-center upup-gap-2">
                        @switch (store.activeSource()) {
                            @case ('googleDrive') {
                                <upup-google-drive-icon />
                            }
                            @case ('oneDrive') {
                                <upup-one-drive-icon />
                            }
                            @case ('dropbox') {
                                <upup-dropbox-icon />
                            }
                            @case ('box') {
                                <upup-box-icon />
                            }
                            @case ('url') {
                                <upup-link-icon />
                            }
                            @case ('camera') {
                                <upup-camera-icon />
                            }
                            @case ('microphone') {
                                <upup-audio-icon />
                            }
                            @case ('screen') {
                                <upup-screen-capture-icon />
                            }
                            @default {}
                        }
                        <span>{{ sourceName }}</span>
                    </span>
                    <span class="upup-flex upup-items-center upup-gap-2.5">
                        <!-- Portal host for a source view's header extras (drive
                             avatar + log out); lives left of Back. empty:hidden
                             keeps the flex gap from showing when nothing portals
                             in. -->
                        <span
                            #headerExtraHost
                            data-upup-slot="source-view-header-extra"
                            class="upup-flex upup-items-center upup-gap-2.5 empty:upup-hidden"
                        ></span>
                        <button
                            [class]="cancelBtnClass"
                            (click)="handleCancel()"
                            type="button"
                        >
                            {{ store.translations().overlayBack }}
                        </button>
                    </span>
                </div>

                <!-- Content row: the active source component -->
                <div class="upup-overflow-hidden">
                    @switch (store.activeSource()) {
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
                            <upup-one-drive-uploader />
                        }
                        @case ('dropbox') {
                            <upup-dropbox-uploader />
                        }
                        @case ('box') {
                            <upup-box-uploader />
                        }
                        @default {
                            <div
                                class="upup-flex upup-h-full upup-items-center upup-justify-center"
                            >
                                <upup-default-loader-icon />
                            </div>
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
    // Optional: the host provider lives at the <upup-uploader> level in the real
    // app; isolated component tests may mount SourceView without it. Mirrors
    // svelte's `useSourceViewHeaderExtra() ?? …` graceful fallback.
    private readonly headerExtra = inject(SourceViewHeaderExtraService, {
        optional: true,
    })

    /**
     * Expose the header-extra host span to the service as it enters/leaves the
     * `@if (shouldRender)` block. The drive browser header portals its account
     * controls (avatar + log out + separator) into it. Angular has no
     * <Teleport>, so the shared host element + appendChild in the consumer is
     * the framework idiom mirroring React's SourceViewHeaderExtraContext /
     * Svelte's context store + portal action.
     */
    @ViewChild('headerExtraHost')
    set headerExtraHost(ref: ElementRef<HTMLElement> | undefined) {
        this.headerExtra?.setHost(ref?.nativeElement ?? null)
    }

    /** Mirror svelte: shouldRender = !!activeComponent && !mini && !!activeSource */
    get shouldRender(): boolean {
        const active = this.store.activeSource()
        const mini = this.store.uiProps.mini
        return !!active && !mini
    }

    /** Provider display name shown next to the icon in the transparent header. */
    get sourceName(): string {
        const active = this.store.activeSource()
        if (!active) return ''
        const translations = this.store.translations() as Record<string, string>
        const nameKey = sourceNameKeys[active]
        return translations[nameKey] ?? nameKey ?? ''
    }

    get headerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-flex upup-items-center upup-justify-between upup-gap-2 upup-px-3 upup-py-2 upup-text-sm upup-font-medium',
            dark ? 'upup-text-[#FAFAFA]' : 'upup-text-[#0f172a]',
            slotClasses.sourceViewHeader ?? '',
        )
    }

    get cancelBtnClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-rounded-md upup-p-1 upup-text-[#0284c7] upup-transition-all upup-duration-300',
            dark ? 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]' : '',
            slotClasses.sourceViewCancelButton ?? '',
        )
    }

    handleCancel(): void {
        const active = this.store.activeSource()
        this.store.core?.emit('source-view-cancel', { sourceId: active })
        this.store.setActiveSource(undefined)
    }
}
