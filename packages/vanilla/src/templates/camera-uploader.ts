import { html, nothing } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { formatUiMessage as t, cn } from '@upup/core'
import type { RootContext } from '../lib/types'
import { adapterViewContainer } from './shared/adapter-view-container'

export function cameraUploader(ctx: RootContext) {
  const cam = ctx.controllers.getCamera()
  const s = cam.getSnapshot()
  const isDark = ctx.theme.getSnapshot().isDark
  const slot = ctx.theme.getSnapshot().slotOverrides
  const tr = ctx.translations

  const inner = html`
    <div data-testid="upup-camera-uploader" class="upup-flex upup-h-full upup-w-full upup-flex-col upup-justify-center upup-overflow-auto upup-px-3 upup-py-2">
      <div class="upup-flex-1 upup-pt-10">
        ${s.capturedUrl
          ? html`
              <div
                class=${cn('upup-relative upup-aspect-video upup-bg-black/[0.025] upup-bg-contain upup-bg-center upup-bg-no-repeat upup-shadow-xl', { 'upup-bg-white/5 dark:upup-bg-white/5': isDark }, slot.cameraPreviewContainer)}
                style=${`background-image: url(${s.capturedUrl})`}
              >
                <button @click=${() => cam.clearUrl()} class=${cn('upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]', slot.cameraDeleteButton)} type="button">${nothing}</button>
              </div>`
          : html`
              <video
                ${ref(cam.videoRef)}
                autoplay muted playsinline class="upup-aspect-video upup-rounded-xl"
              ></video>`}
      </div>
      <div class="upup-flex upup-gap-4">
        ${!s.capturedUrl
          ? html`
              <button class=${cn('upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300', { 'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': isDark }, slot.cameraCaptureButton)} @click=${() => cam.capture()} type="button">
                <span>${nothing}</span><span>${tr.capture}</span>
              </button>
              <button class=${cn('upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600', slot.cameraRotateButton)} @click=${() => cam.handleCameraSwitch()} type="button">
                <span>${nothing}</span><span>${t(tr.switchToCamera, { side: s.newCameraSide === 'front' ? tr.front : tr.back })}</span>
              </button>`
          : html`
              <button class=${cn('upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300', { 'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': isDark }, slot.cameraAddButton)} @click=${() => void cam.handleFetchImage()} type="button">${tr.addImage}</button>`}
      </div>
    </div>`

  return adapterViewContainer(ctx, { dataUpupSlot: 'camera-uploader' }, inner)
}
