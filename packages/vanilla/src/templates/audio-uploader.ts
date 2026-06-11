import { html, nothing } from 'lit-html'
import { cn } from '@upup/core'
import type { RootContext } from '../lib/types'
import { adapterViewContainer } from './shared/adapter-view-container'

export function audioUploader(ctx: RootContext) {
  const a = ctx.controllers.getAudio()
  const s = a.getSnapshot()
  const isDark = ctx.theme.getSnapshot().isDark

  if (s.error) {
    return adapterViewContainer(ctx, { dataUpupSlot: 'audio-uploader' }, html`
      <div class="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center">
        <p class=${cn('upup-text-sm upup-text-red-500', { 'upup-text-red-400': isDark })}>${s.error}</p>
      </div>`)
  }

  const inner = html`
    <div class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-6 upup-p-6">
      <div class=${cn('upup-flex upup-h-24 upup-w-24 upup-items-center upup-justify-center upup-rounded-full', { 'upup-bg-red-500/20': s.recordingState === 'recording', 'upup-bg-blue-500/20': s.recordingState === 'idle' || s.recordingState === 'recorded' })}>
        <div class=${cn('upup-flex upup-h-16 upup-w-16 upup-items-center upup-justify-center upup-rounded-full upup-transition-all', { 'upup-animate-pulse upup-bg-red-500': s.recordingState === 'recording', 'upup-bg-blue-500': s.recordingState === 'idle' || s.recordingState === 'recorded' })}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>
      </div>
      <span class=${cn('upup-text-2xl upup-font-mono upup-tabular-nums', { 'upup-text-[#1b1b1b]': !isDark, 'upup-text-white': isDark })}>${a.formatTime(s.duration)}</span>
      ${s.recordingState === 'recorded' && s.audioUrl ? html`<audio controls src=${s.audioUrl} class="upup-w-full upup-max-w-xs"></audio>` : nothing}
      <div class="upup-flex upup-gap-3">
        ${s.recordingState === 'idle'
          ? html`<button type="button" class=${cn('upup-rounded-lg upup-bg-blue-600 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700', { 'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]': isDark })} @click=${() => void a.startRecording()}>Start Recording</button>`
          : nothing}
        ${s.recordingState === 'recording'
          ? html`<button type="button" class="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600" @click=${() => a.stopRecording()}>Stop Recording</button>`
          : nothing}
        ${s.recordingState === 'recorded'
          ? html`
              <button type="button" class="upup-rounded-lg upup-bg-gray-500 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-gray-600" @click=${() => a.discardRecording()}>Discard</button>
              <button type="button" class=${cn('upup-rounded-lg upup-bg-blue-600 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700', { 'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]': isDark })} @click=${() => a.addRecording()}>Add Recording</button>`
          : nothing}
      </div>
    </div>`

  return adapterViewContainer(ctx, { dataUpupSlot: 'audio-uploader' }, inner)
}
