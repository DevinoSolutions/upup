import {
    Component,
    inject,
    OnDestroy,
    ViewChild,
    ElementRef,
} from '@angular/core'
import { cn } from '@upupjs/core/internal'
import { UpupStore } from '../upup-store.service'
import { SourceViewContainerComponent } from './source-view-container.component'

type RecordingState = 'idle' | 'recording' | 'recorded'

/**
 * Screen capture recorder leaf — port of ScreenCaptureUploader.svelte.
 *
 * Slot name : "screen-capture-uploader"
 * (Both error-state and normal-state AVC use slotName="screen-capture-uploader".)
 *
 * Svelte parity:
 *   - getDisplayMedia for screen + audio (svelte: navigator.mediaDevices.getDisplayMedia)
 *   - Inline MediaRecorder lifecycle (no shared composable in svelte either)
 *   - stream.getVideoTracks()[0].onended → auto-stop when user stops sharing
 *   - Cleanup on ngOnDestroy (svelte: onDestroy)
 *   - previewEl bound via @ViewChild (svelte: bind:this={previewEl})
 *   - retryRecording() resets error and calls startRecording()
 *
 * Auto-start guard for tests:
 *   startRecording() only runs on user click ("Share Screen"), not on mount → no jsdom hang.
 */
@Component({
    selector: 'upup-screen-capture-uploader',
    standalone: true,
    imports: [SourceViewContainerComponent],
    template: `
        @if (error) {
            <!-- Error state -->
            <upup-source-view-container slotName="screen-capture-uploader">
                <div
                    class="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center"
                >
                    <p [class]="errorTextClass">{{ error }}</p>
                    <button
                        type="button"
                        [class]="retryButtonClass"
                        (click)="retryRecording()"
                    >
                        Try Again
                    </button>
                </div>
            </upup-source-view-container>
        } @else {
            <!-- Normal state -->
            <upup-source-view-container slotName="screen-capture-uploader">
                <div
                    class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-4"
                >
                    <!-- Idle -->
                    @if (recordingState === 'idle') {
                        <div
                            class="upup-flex upup-flex-col upup-items-center upup-gap-4"
                        >
                            <div
                                class="upup-flex upup-h-20 upup-w-20 upup-items-center upup-justify-center upup-rounded-full upup-bg-[#0ea5e9]/20"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    [attr.stroke]="
                                        store.isDark() ? '#38bdf8' : '#0284c7'
                                    "
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <rect
                                        width="20"
                                        height="15"
                                        x="2"
                                        y="3"
                                        rx="2"
                                    />
                                    <polyline points="8 21 16 21" />
                                    <line x1="12" x2="12" y1="18" y2="21" />
                                </svg>
                            </div>
                            <button
                                type="button"
                                [class]="shareButtonClass"
                                (click)="startRecording()"
                            >
                                Share Screen
                            </button>
                        </div>
                    }

                    <!-- Recording -->
                    @if (recordingState === 'recording') {
                        <!-- svelte-ignore a11y_media_has_caption -->
                        <video
                            #previewEl
                            muted
                            class="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
                        ></video>
                        <div class="upup-flex upup-items-center upup-gap-3">
                            <span
                                class="upup-h-3 upup-w-3 upup-animate-pulse upup-rounded-full upup-bg-red-500"
                            ></span>
                            <span [class]="timerClass">{{
                                formatTime(duration)
                            }}</span>
                        </div>
                        <button
                            type="button"
                            class="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
                            (click)="stopRecording()"
                        >
                            Stop Recording
                        </button>
                    }

                    <!-- Recorded -->
                    @if (recordingState === 'recorded' && videoUrl) {
                        <!-- svelte-ignore a11y_media_has_caption -->
                        <video
                            controls
                            [src]="videoUrl"
                            class="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
                        ></video>
                        <div class="upup-flex upup-gap-3">
                            <button
                                type="button"
                                class="upup-rounded-lg upup-bg-gray-500 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-gray-600"
                                (click)="discardRecording()"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                [class]="addButtonClass"
                                (click)="addRecording()"
                            >
                                Add Recording
                            </button>
                        </div>
                    }
                </div>
            </upup-source-view-container>
        }
    `,
})
export class ScreenCaptureUploaderComponent implements OnDestroy {
    readonly store = inject(UpupStore)

    recordingState: RecordingState = 'idle'
    duration = 0
    videoUrl: string | null = null
    error: string | null = null

    @ViewChild('previewEl')
    set previewEl(ref: ElementRef<HTMLVideoElement> | undefined) {
        const el = ref?.nativeElement
        if (el && this.streamRef) {
            el.srcObject = this.streamRef
            // upup-catch: play() may reject if autoplay is blocked — swallow since preview is best-effort
            void el.play()?.catch(() => {})
        }
    }

    private mediaRecorder: MediaRecorder | null = null
    private chunks: Blob[] = []
    private timerHandle: ReturnType<typeof setInterval> | null = null
    private streamRef: MediaStream | null = null

    ngOnDestroy(): void {
        if (this.timerHandle) clearInterval(this.timerHandle)
        if (this.videoUrl) URL.revokeObjectURL(this.videoUrl)
        this.streamRef?.getTracks().forEach(t => {
            t.stop()
        })
    }

    async startRecording(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            })
            this.streamRef = stream
            this.chunks = []

            const [videoTrack] = stream.getVideoTracks()
            if (videoTrack) {
                videoTrack.onended = () => {
                    if (
                        this.mediaRecorder &&
                        this.mediaRecorder.state !== 'inactive'
                    ) {
                        this.mediaRecorder.stop()
                        if (this.timerHandle) clearInterval(this.timerHandle)
                        this.recordingState = 'recorded'
                    }
                }
            }

            const recorder = new MediaRecorder(stream)
            this.mediaRecorder = recorder

            recorder.ondataavailable = e => {
                if (e.data.size > 0) this.chunks.push(e.data)
            }

            recorder.onstop = () => {
                const blob = new Blob(this.chunks, {
                    type: recorder.mimeType || 'video/webm',
                })
                this.videoUrl = URL.createObjectURL(blob)
                stream.getTracks().forEach(t => {
                    t.stop()
                })
            }

            recorder.start()
            this.recordingState = 'recording'
            this.duration = 0
            this.timerHandle = setInterval(() => {
                this.duration++
            }, 1000)
        } catch {
            // upup-catch: screen-share cancel/denial is surfaced to the user via the error snapshot the screen-capture template renders
            this.error =
                'Screen sharing is not supported or was denied. Please try again.'
        }
    }

    stopRecording(): void {
        this.mediaRecorder?.stop()
        if (this.timerHandle) clearInterval(this.timerHandle)
        this.recordingState = 'recorded'
    }

    discardRecording(): void {
        if (this.videoUrl) URL.revokeObjectURL(this.videoUrl)
        this.videoUrl = null
        this.duration = 0
        this.recordingState = 'idle'
    }

    addRecording(): void {
        if (!this.videoUrl) return
        fetch(this.videoUrl)
            .then(r => r.blob())
            .then(blob => {
                const file = new File(
                    [blob],
                    `screen-recording-${Date.now()}.webm`,
                    {
                        type: blob.type,
                    },
                )
                void this.store.handleSetSelectedFiles([file])
                this.store.setActiveSource(undefined)
            })
            .catch((err: unknown) => {
                this.error =
                    err instanceof Error
                        ? err.message
                        : 'Failed to add the recording. Please try again.'
            })
    }

    retryRecording(): void {
        this.error = null
        void this.startRecording()
    }

    formatTime(s: number): string {
        const m = Math.floor(s / 60)
        const sec = s % 60
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    // ── Class builders ────────────────────────────────────────────────────────

    get errorTextClass(): string {
        return cn('upup-text-sm upup-text-red-500', {
            'upup-text-red-400': this.store.isDark(),
        })
    }

    get retryButtonClass(): string {
        return cn(
            'upup-rounded-lg upup-bg-[#0ea5e9] upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
            {
                'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': this.store.isDark(),
            },
        )
    }

    get shareButtonClass(): string {
        return cn(
            'upup-rounded-lg upup-bg-[#0ea5e9] upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-[#0284c7]',
            {
                'upup-bg-[#38bdf8] hover:upup-bg-[#0ea5e9] dark:upup-bg-[#38bdf8]':
                    this.store.isDark(),
            },
        )
    }

    get timerClass(): string {
        return cn('upup-font-mono upup-text-lg upup-tabular-nums', {
            'upup-text-[#1b1b1b]': !this.store.isDark(),
            'upup-text-white': this.store.isDark(),
        })
    }

    get addButtonClass(): string {
        return cn(
            'upup-rounded-lg upup-bg-[#0ea5e9] upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-[#0284c7]',
            {
                'upup-bg-[#38bdf8] hover:upup-bg-[#0ea5e9] dark:upup-bg-[#38bdf8]':
                    this.store.isDark(),
            },
        )
    }
}
