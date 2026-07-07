import type { FileSource } from '@upup/core'
import type { SourceController } from '../lib/types'

export type RecordingState = 'idle' | 'recording' | 'recorded'

export interface AudioDeps {
    setFiles: (files: File[]) => Promise<void>
    setActiveSource: (a: FileSource | undefined) => void
    invalidate: () => void
}

export interface AudioSnapshot {
    recordingState: RecordingState
    duration: number
    audioUrl: string | null
    error: string | null
}

export class AudioRecorderController implements SourceController<AudioSnapshot> {
    private recordingState: RecordingState = 'idle'
    private duration = 0
    private audioUrl: string | null = null
    private error: string | null = null
    private mediaRecorder: MediaRecorder | null = null
    private chunks: Blob[] = []
    private timerHandle: ReturnType<typeof setInterval> | null = null
    private streamRef: MediaStream | null = null
    private destroyed = false

    constructor(private deps: AudioDeps) {}

    activate(): void {
        /* no auto-start; user clicks Start Recording */
    }
    deactivate(): void {
        this.destroy()
    }

    async startRecording(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
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
            const recorder = new MediaRecorder(stream)
            this.mediaRecorder = recorder
            recorder.ondataavailable = e => {
                if (e.data.size > 0) this.chunks.push(e.data)
            }
            recorder.onstop = () => {
                const blob = new Blob(this.chunks, {
                    type: recorder.mimeType || 'audio/webm',
                })
                this.audioUrl = URL.createObjectURL(blob)
                stream.getTracks().forEach(t => {
                    t.stop()
                })
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
            // upup-catch: mic permission denial is surfaced to the user via the error snapshot the audio template renders
            this.error =
                'Microphone access denied. Please allow microphone access and try again.'
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
        if (this.audioUrl) URL.revokeObjectURL(this.audioUrl)
        this.audioUrl = null
        this.duration = 0
        this.recordingState = 'idle'
        this.deps.invalidate()
    }

    addRecording(): void {
        if (!this.audioUrl) return
        const ext = this.mediaRecorder?.mimeType.includes('webm')
            ? 'webm'
            : 'ogg'
        void fetch(this.audioUrl)
            .then(r => r.blob())
            .then(async blob => {
                const file = new File(
                    [blob],
                    `recording-${Date.now()}.${ext}`,
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

    formatTime(s: number): string {
        const m = Math.floor(s / 60)
        const sec = s % 60
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    getSnapshot(): AudioSnapshot {
        return {
            recordingState: this.recordingState,
            duration: this.duration,
            audioUrl: this.audioUrl,
            error: this.error,
        }
    }

    destroy(): void {
        this.destroyed = true
        if (this.timerHandle) clearInterval(this.timerHandle)
        if (this.mediaRecorder) {
            this.mediaRecorder.ondataavailable = null
            this.mediaRecorder.onstop = null
            if (this.mediaRecorder.state !== 'inactive')
                this.mediaRecorder.stop()
            this.mediaRecorder = null
        }
        if (this.audioUrl) URL.revokeObjectURL(this.audioUrl)
        this.streamRef?.getTracks().forEach(t => {
            t.stop()
        })
        this.streamRef = null
    }
}
