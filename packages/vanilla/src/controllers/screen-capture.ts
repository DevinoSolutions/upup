import type { FileSource } from '@useupup/core'
import type { SourceController } from '../lib/types'

export type RecordingState = 'idle' | 'recording' | 'recorded'

export interface ScreenDeps {
    setFiles: (files: File[]) => Promise<void>
    setActiveSource: (a: FileSource | undefined) => void
    invalidate: () => void
}

export interface ScreenSnapshot {
    recordingState: RecordingState
    duration: number
    videoUrl: string | null
    error: string | null
}

export class ScreenCaptureController implements SourceController<ScreenSnapshot> {
    private recordingState: RecordingState = 'idle'
    private duration = 0
    private videoUrl: string | null = null
    private error: string | null = null
    private mediaRecorder: MediaRecorder | null = null
    private chunks: Blob[] = []
    private timerHandle: ReturnType<typeof setInterval> | null = null
    private streamRef: MediaStream | null = null
    private previewEl: HTMLVideoElement | null = null
    private destroyed = false

    constructor(private deps: ScreenDeps) {}

    /** STABLE ref (one identity per controller life) so lit-html only invokes it on real <video>
     *  mount/unmount. An inline-arrow ref re-fires every render; the recording timer invalidates
     *  each second, so an inline ref would re-bind srcObject + re-call play() every frame. */
    readonly previewRef = (el: Element | undefined): void => {
        this.setPreviewEl((el as HTMLVideoElement | undefined) ?? null)
    }

    activate(): void {}
    deactivate(): void {
        this.destroy()
    }

    setPreviewEl(el: HTMLVideoElement | null): void {
        this.previewEl = el
        if (el && this.streamRef && this.recordingState === 'recording') {
            el.srcObject = this.streamRef
            void el.play()
        }
    }

    async startRecording(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            })
            if (this.destroyed) {
                stream.getTracks().forEach(t => {
                    t.stop()
                })
                return
            }
            this.streamRef = stream
            this.chunks = []
            if (this.previewEl) {
                this.previewEl.srcObject = stream
                void this.previewEl.play()
            }
            const videoTrack = stream.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.onended = () => {
                    if (
                        this.mediaRecorder &&
                        this.mediaRecorder.state !== 'inactive'
                    )
                        this.mediaRecorder.stop()
                    if (this.timerHandle) clearInterval(this.timerHandle)
                    this.recordingState = 'recorded'
                    this.deps.invalidate()
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
                if (this.previewEl) this.previewEl.srcObject = null
                this.deps.invalidate()
            }
            recorder.start()
            this.recordingState = 'recording'
            this.duration = 0
            this.timerHandle = setInterval(() => {
                this.duration++
                this.deps.invalidate()
            }, 1000)
            this.deps.invalidate()
        } catch {
            // upup-catch: screen-share cancel/denial is surfaced to the user via the error snapshot the screen-capture template renders
            this.error =
                'Screen sharing was cancelled or denied. Please try again.'
            this.deps.invalidate()
        }
    }

    stopRecording(): void {
        this.mediaRecorder?.stop()
        if (this.timerHandle) clearInterval(this.timerHandle)
        this.recordingState = 'recorded'
        this.deps.invalidate()
    }

    discardRecording(): void {
        if (this.videoUrl) URL.revokeObjectURL(this.videoUrl)
        this.videoUrl = null
        this.duration = 0
        this.recordingState = 'idle'
        this.deps.invalidate()
    }

    addRecording(): void {
        if (!this.videoUrl) return
        void fetch(this.videoUrl)
            .then(r => r.blob())
            .then(async blob => {
                const file = new File(
                    [blob],
                    `screen-recording-${Date.now()}.webm`,
                    {
                        type: blob.type,
                    },
                )
                await this.deps.setFiles([file])
                this.deps.setActiveSource(undefined)
            })
            .catch(() => {
                // upup-catch: replaying an in-memory object URL cannot fail in practice; ignore
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

    getSnapshot(): ScreenSnapshot {
        return {
            recordingState: this.recordingState,
            duration: this.duration,
            videoUrl: this.videoUrl,
            error: this.error,
        }
    }

    destroy(): void {
        this.destroyed = true
        if (this.timerHandle) clearInterval(this.timerHandle)
        if (this.streamRef)
            this.streamRef.getVideoTracks().forEach(t => {
                t.onended = null
            })
        if (this.mediaRecorder) {
            this.mediaRecorder.ondataavailable = null
            this.mediaRecorder.onstop = null
            if (this.mediaRecorder.state !== 'inactive')
                this.mediaRecorder.stop()
            this.mediaRecorder = null
        }
        if (this.videoUrl) URL.revokeObjectURL(this.videoUrl)
        if (this.previewEl) this.previewEl.srcObject = null
        this.streamRef?.getTracks().forEach(t => {
            t.stop()
        })
        this.streamRef = null
    }
}
