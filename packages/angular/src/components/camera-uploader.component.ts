import {
    Component,
    inject,
    OnDestroy,
    AfterViewInit,
    ViewChild,
    ElementRef,
    Type,
    effect,
} from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { formatUiMessage as t } from '@upup/core'
import { cn } from '@upup/core/internal'
import { UpupStore } from '../upup-store.service'
import { CameraUploaderService } from '../services/camera-uploader.service'
import { SourceViewContainerComponent } from './source-view-container.component'

/**
 * Camera uploader leaf — port of CameraUploader.svelte.
 *
 * Slot name : "camera-uploader"
 * (SourceViewContainer inner div carries data-upup-slot="camera-uploader";
 * the outer div inside the AVC carries data-testid="upup-camera-uploader".)
 *
 * Svelte parity:
 *   - CameraUploaderService ↔ useCameraUploader composable
 *   - ngOnInit calls startCamera() (svelte: onMount → startCamera())
 *   - facingMode changes watched via effect → restartCamera when no capture is shown
 *   - videoEl bound via @ViewChild (svelte: bind:this={videoEl})
 *   - ngOnDestroy calls stopCamera() (svelte: onDestroy → stopCamera())
 *
 * Auto-start guard for tests:
 *   CameraUploaderService.startCamera() is called in ngAfterViewInit, which runs in
 *   jsdom. navigator.mediaDevices.getUserMedia in jsdom throws/returns a rejected
 *   promise which the service silently catches (camera unavailable — leave stream null).
 *   Tests that want to verify startCamera() must mock navigator.mediaDevices.getUserMedia
 *   before rendering the component.
 */
@Component({
    selector: 'upup-camera-uploader',
    standalone: true,
    imports: [NgComponentOutlet, SourceViewContainerComponent],
    providers: [CameraUploaderService],
    template: `
        <upup-source-view-container slotName="camera-uploader">
            <div
                data-testid="upup-camera-uploader"
                class="upup-flex upup-h-full upup-w-full upup-flex-col upup-justify-center upup-overflow-hidden upup-px-3 upup-py-2"
            >
                <div
                    class="upup-flex upup-min-h-0 upup-flex-1 upup-items-center upup-justify-center upup-pt-2"
                >
                    @if (cameraSvc.capturedUrl()) {
                        <div
                            [class]="previewContainerClass"
                            [style.background-image]="
                                'url(' + cameraSvc.capturedUrl() + ')'
                            "
                        >
                            <button
                                (click)="cameraSvc.clearUrl()"
                                [class]="deleteButtonClass"
                                type="button"
                            >
                                <ng-container
                                    [ngComponentOutlet]="cameraDeleteIcon"
                                />
                            </button>
                        </div>
                    } @else {
                        <!-- Video feed -->
                        <video
                            #videoEl
                            autoplay
                            muted
                            playsinline
                            class="upup-aspect-video upup-max-h-full upup-max-w-full upup-rounded-xl upup-object-contain"
                        ></video>
                    }
                </div>

                <div class="upup-flex upup-shrink-0 upup-gap-4">
                    @if (!cameraSvc.capturedUrl()) {
                        <button
                            [class]="captureButtonClass"
                            (click)="cameraSvc.capture()"
                            type="button"
                        >
                            <span
                                ><ng-container
                                    [ngComponentOutlet]="cameraCaptureIcon"
                            /></span>
                            <span>{{ store.translations().capture }}</span>
                        </button>
                        <button
                            [class]="rotateButtonClass"
                            (click)="cameraSvc.handleCameraSwitch()"
                            type="button"
                        >
                            <span
                                ><ng-container
                                    [ngComponentOutlet]="cameraRotateIcon"
                            /></span>
                            <span>{{ switchLabel }}</span>
                        </button>
                    } @else {
                        <button
                            [class]="addButtonClass"
                            (click)="cameraSvc.handleFetchImage()"
                            type="button"
                        >
                            {{ store.translations().addImage }}
                        </button>
                    }
                </div>
            </div>
        </upup-source-view-container>
    `,
})
export class CameraUploaderComponent implements AfterViewInit, OnDestroy {
    readonly store = inject(UpupStore)
    readonly cameraSvc = inject(CameraUploaderService)

    @ViewChild('videoEl') videoElRef?: ElementRef<HTMLVideoElement>

    constructor() {
        // Restart camera when facingMode changes and no capture is shown
        // (mirrors svelte's facingMode.subscribe inside onMount)
        effect(() => {
            const _fm = this.cameraSvc.facingMode() // track signal
            const capturedUrl = this.cameraSvc.capturedUrl()
            if (!capturedUrl && this.videoElRef) {
                // Re-sync video element ref before restarting
                this.cameraSvc.setVideoEl(this.videoElRef.nativeElement)
                void this.cameraSvc.startCamera()
            }
        })
    }

    ngAfterViewInit(): void {
        if (this.videoElRef) {
            this.cameraSvc.setVideoEl(this.videoElRef.nativeElement)
        }
        void this.cameraSvc.startCamera()
    }

    ngOnDestroy(): void {
        this.cameraSvc.stopCamera()
    }

    // ── Icon accessors ────────────────────────────────────────────────────────

    get cameraCaptureIcon(): Type<unknown> {
        return this.store.uiProps.icons.CameraCaptureIcon as Type<unknown>
    }

    get cameraRotateIcon(): Type<unknown> {
        return this.store.uiProps.icons.CameraRotateIcon as Type<unknown>
    }

    get cameraDeleteIcon(): Type<unknown> {
        return this.store.uiProps.icons.CameraDeleteIcon as Type<unknown>
    }

    // ── Computed labels ───────────────────────────────────────────────────────

    get switchLabel(): string {
        const tr = this.store.translations()
        const side =
            this.cameraSvc.newCameraSide() === 'front' ? tr.front : tr.back
        return t(tr.switchToCamera, { side })
    }

    // ── Class builders ────────────────────────────────────────────────────────

    get previewContainerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-relative upup-aspect-video upup-max-h-full upup-max-w-full upup-bg-black/[0.025] upup-bg-contain upup-bg-center upup-bg-no-repeat upup-shadow-xl',
            {
                'upup-bg-white/5 dark:upup-bg-white/5': dark,
            },
            slotClasses.cameraPreviewContainer,
        )
    }

    get deleteButtonClass(): string {
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]',
            slotClasses.cameraDeleteButton,
        )
    }

    get captureButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
            {
                'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': dark,
            },
            slotClasses.cameraCaptureButton,
        )
    }

    get rotateButtonClass(): string {
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600',
            slotClasses.cameraRotateButton,
        )
    }

    get addButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
            {
                'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': dark,
            },
            slotClasses.cameraAddButton,
        )
    }
}
