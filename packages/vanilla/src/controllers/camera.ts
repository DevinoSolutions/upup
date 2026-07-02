import type { UpupCore, FileSource } from '@upup/core'
import type { SourceController } from '../lib/types'

export enum FacingMode { Environment = 'environment', User = 'user' }

export interface CameraDeps {
  core: UpupCore
  setFiles: (files: File[]) => Promise<void>
  setActiveSource: (a: FileSource | undefined) => void
  invalidate: () => void
}

export interface CameraSnapshot {
  capturedUrl: string
  facingMode: FacingMode
  newCameraSide: 'front' | 'back'
}

export class CameraController implements SourceController<CameraSnapshot> {
  private capturedUrl = ''
  private facingMode: FacingMode = FacingMode.Environment
  private stream: MediaStream | null = null
  private videoEl: HTMLVideoElement | null = null
  private destroyed = false

  constructor(private deps: CameraDeps) {}

  /** STABLE ref callback (one identity for the controller's life) so lit-html only invokes it
   *  on real <video> mount/unmount. An inline-arrow ref re-fires every render; since startCamera()
   *  calls invalidate() on success, that would loop getUserMedia and restart the camera endlessly. */
  readonly videoRef = (el: Element | undefined) => {
    const v = (el as HTMLVideoElement | undefined) ?? null
    this.setVideoEl(v)
    if (v && !this.stream) void this.startCamera()
  }

  setVideoEl(el: HTMLVideoElement | null) {
    this.videoEl = el
    if (el && this.stream) { el.srcObject = this.stream; void el.play() }
  }

  activate() { /* startCamera() is driven by the <video> ref on mount */ }
  deactivate() { this.stopCamera() }

  async startCamera() {
    try {
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop())
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this.facingMode } })
      if (this.destroyed) { mediaStream.getTracks().forEach((t) => t.stop()); return }
      this.stream = mediaStream
      if (this.videoEl) { this.videoEl.srcObject = mediaStream; void this.videoEl.play() }
      this.deps.invalidate()
    } catch { /* camera unavailable — leave stream null */ }
  }

  stopCamera() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop())
    this.stream = null
    if (this.videoEl) this.videoEl.srcObject = null
  }

  capture() {
    if (!this.videoEl) return
    const canvas = document.createElement('canvas')
    canvas.width = this.videoEl.videoWidth
    canvas.height = this.videoEl.videoHeight
    const c = canvas.getContext('2d')
    if (!c) return
    c.drawImage(this.videoEl, 0, 0)
    this.capturedUrl = canvas.toDataURL('image/jpeg')
    this.deps.core.emit('camera-capture', { dataUrl: this.capturedUrl })
    this.deps.invalidate()
  }

  clearUrl() { this.capturedUrl = ''; this.deps.invalidate() }

  async handleFetchImage() {
    if (!this.capturedUrl) return
    const response = await fetch(this.capturedUrl)
    const blob = await response.blob()
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await this.deps.setFiles([file])
    this.capturedUrl = ''
    this.deps.setActiveSource(undefined)
    this.deps.core.emit('camera-confirm', { file })
  }

  handleCameraSwitch() {
    this.facingMode = this.facingMode === FacingMode.Environment ? FacingMode.User : FacingMode.Environment
    if (!this.capturedUrl) void this.startCamera()
    this.deps.invalidate()
  }

  getSnapshot(): CameraSnapshot {
    return {
      capturedUrl: this.capturedUrl,
      facingMode: this.facingMode,
      newCameraSide: this.facingMode === FacingMode.Environment ? 'front' : 'back',
    }
  }

  destroy() { this.destroyed = true; this.stopCamera() }
}
