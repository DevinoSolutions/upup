import { Injectable, inject, signal, computed } from '@angular/core'
import { UpupStore } from '../upup-store.service'

export enum FacingMode {
    Environment = 'environment',
    User = 'user',
}

/**
 * Angular port of useCameraUploader (svelte composable).
 *
 * Manages getUserMedia stream lifecycle, canvas capture → File, facing-mode switch.
 * The video element is wired in by the component via setVideoEl() (mirrors svelte's
 * bind:this={videoEl} + $effect(() => setVideoEl(videoEl))).
 *
 * Cleanup: call stopCamera() from ngOnDestroy.
 */
@Injectable()
export class CameraUploaderService {
    private store = inject(UpupStore)

    private videoEl: HTMLVideoElement | null = null
    private stream: MediaStream | null = null

    readonly capturedUrl = signal('')
    readonly facingMode = signal<FacingMode>(FacingMode.Environment)

    /** 'front' when environment-facing (switch button shows "Switch to front"), 'back' otherwise. */
    readonly newCameraSide = computed(() =>
        this.facingMode() === FacingMode.Environment ? 'front' : 'back',
    )

    // ── Video element binding ──────────────────────────────────────────────────

    setVideoEl(el: HTMLVideoElement | null): void {
        this.videoEl = el
    }

    // ── Camera lifecycle ───────────────────────────────────────────────────────

    async startCamera(): Promise<void> {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(t => t.stop())
            }
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.facingMode() },
            })
            this.stream = mediaStream
            if (this.videoEl) {
                this.videoEl.srcObject = mediaStream
                // play() returns undefined in jsdom — optional-chain so .catch() is skipped
                void this.videoEl.play()?.catch(() => {})
            }
        } catch {
            // camera unavailable — leave stream null (svelte parity)
        }
    }

    stopCamera(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop())
            this.stream = null
        }
        if (this.videoEl) {
            this.videoEl.srcObject = null
        }
    }

    // ── Capture ────────────────────────────────────────────────────────────────

    capture(): void {
        if (!this.videoEl) return

        const canvas = document.createElement('canvas')
        canvas.width = this.videoEl.videoWidth
        canvas.height = this.videoEl.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(this.videoEl, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg')
        this.capturedUrl.set(dataUrl)
        this.store.core?.emit('camera-capture', { dataUrl })
    }

    clearUrl(): void {
        this.capturedUrl.set('')
    }

    async handleFetchImage(): Promise<void> {
        const currentUrl = this.capturedUrl()
        if (!currentUrl) return

        const response = await fetch(currentUrl)
        const blob = await response.blob()
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
        })
        await this.store.handleSetSelectedFiles([file])
        this.capturedUrl.set('')
        this.store.setActiveSource(undefined)
        this.store.core?.emit('camera-confirm', { file })
    }

    handleCameraSwitch(): void {
        this.facingMode.update(fm =>
            fm === FacingMode.Environment
                ? FacingMode.User
                : FacingMode.Environment,
        )
    }
}
