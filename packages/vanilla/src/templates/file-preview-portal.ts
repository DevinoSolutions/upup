import { html, nothing } from 'lit-html'
import type { TemplateResult } from 'lit-html'
import {
  formatUiMessage as t,
  fileGetIsImage,
  fileGetIsPdf,
  fileGetIsText,
  PREVIEW_MAX_TEXT_SIZE,
  PREVIEW_TEXT_TRUNCATE_LENGTH,
  cn,
} from '@upup/core'
import type { RootContext } from '../lib/types'
import { shouldRender } from './should-render'
import { XIcon } from './icons'

// Module-level text cache so repeated re-renders of the same portal don't re-fetch
interface TextState {
  content: string
  loading: boolean
  error: string | undefined
  truncated: boolean
  fetched: boolean
}
const textStateMap = new WeakMap<object, TextState>()

async function loadText(key: object, fileUrl: string, isOversized: boolean, ctx: RootContext): Promise<void> {
  const state = textStateMap.get(key)
  if (!state || state.fetched || state.loading) return
  state.loading = true
  ctx.invalidate()
  try {
    if (isOversized) {
      const res = await fetch(fileUrl)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('Cannot read file')
      const decoder = new TextDecoder()
      let result = ''
      let done = false
      while (!done && result.length < PREVIEW_TEXT_TRUNCATE_LENGTH) {
        const { value, done: streamDone } = await reader.read()
        done = streamDone
        if (value) result += decoder.decode(value, { stream: !done })
      }
      reader.cancel()
      const wasTruncated = !done || result.length > PREVIEW_TEXT_TRUNCATE_LENGTH
      if (wasTruncated) result = result.slice(0, PREVIEW_TEXT_TRUNCATE_LENGTH)
      state.truncated = wasTruncated
      state.content = result
    } else {
      const res = await fetch(fileUrl)
      state.content = await res.text()
    }
    state.fetched = true
  } catch (e) {
    state.error = (e as Error)?.message || 'Preview error'
  } finally {
    state.loading = false
    ctx.invalidate()
  }
}

export function filePreviewPortal(
  ctx: RootContext,
  args: {
    fileType: string
    fileUrl: string
    fileName: string
    fileSize: number | undefined
    onClose: () => void
    onStopPropagation: (e: MouseEvent) => void
  },
): TemplateResult {
  const { fileType, fileUrl, fileName, fileSize, onClose, onStopPropagation } = args
  const tr = ctx.translations
  const { isDark } = ctx.theme.getSnapshot()
  const slot = ctx.theme.getSnapshot().slotOverrides

  const isImage = fileGetIsImage(fileType)
  const isPdf = fileGetIsPdf(fileType, fileName)
  const isText = fileGetIsText(fileType, fileName)
  const isOversizedText = isText && fileSize !== undefined && fileSize > PREVIEW_MAX_TEXT_SIZE

  // Text state management (keyed by args object reference — stable per portal open)
  // We use a fixed key object per portal invocation; since portal re-renders use the same ctx+args
  // we key by a stable object tied to fileUrl+fileName to avoid stale state
  const textKey = args
  if (!textStateMap.has(textKey)) {
    textStateMap.set(textKey, { content: '', loading: false, error: undefined, truncated: false, fetched: false })
  }
  const textState = textStateMap.get(textKey)!

  // Trigger text fetch on first render if applicable
  if (isText && !textState.fetched && !textState.loading && !textState.error) {
    void loadText(textKey, fileUrl, isOversizedText, ctx)
  }

  const onContentClick = (e: MouseEvent) => {
    onStopPropagation(e)
    e.stopPropagation()
  }

  return html`
    <div class="upup-scope" data-upup-slot="file-preview-portal">
      <div
        class="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-label=${fileName}
        tabindex="-1"
        @click=${onClose}
        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }}
      >
        <div class="upup-relative upup-h-[90vh] upup-w-[90vw] upup-p-4">
          <div
            class=${cn(
              'upup-absolute upup-inset-0 upup-m-4 upup-bg-white',
              { 'upup-bg-[#232323] dark:upup-bg-[#232323]': isDark },
              slot.filePreviewPortal,
            )}
            role="presentation"
            @click=${onContentClick}
          >
            <button
              type="button"
              aria-label=${tr.cancel}
              class="upup-absolute upup-right-3 upup-top-3 upup-z-10 upup-flex upup-size-8 upup-items-center upup-justify-center upup-rounded-full upup-bg-black/70 upup-text-sm upup-font-semibold upup-text-white upup-shadow-sm hover:upup-bg-black focus:upup-outline-none focus:upup-ring-2 focus:upup-ring-white"
              @click=${onClose}
            >
              x
            </button>

            ${shouldRender(isImage, () => html`
              <img
                src=${fileUrl}
                alt=${fileName}
                class="upup-h-full upup-w-full upup-rounded upup-object-contain"
              />
            `)}

            ${shouldRender(isPdf, () => html`
              <embed
                src=${fileUrl}
                type="application/pdf"
                width="100%"
                height="100%"
                class="upup-rounded"
                title=${fileName}
              />
            `)}

            ${shouldRender(!isImage && !isPdf, () => html`
              ${shouldRender(isText, () => html`
                <div class="upup-h-full upup-w-full upup-overflow-auto upup-p-4 upup-font-mono upup-text-xs">
                  ${textState.loading ? html`<p>${tr.loading}</p>` : nothing}
                  ${textState.error ? html`<p>${t(tr.previewError, { message: textState.error })}</p>` : nothing}
                  ${!textState.loading && !textState.error ? html`
                    <pre class="upup-whitespace-pre-wrap">${textState.content}</pre>
                    ${textState.truncated ? html`
                      <div class="upup-mt-4 upup-rounded upup-border upup-border-yellow-500/30 upup-bg-yellow-500/10 upup-px-3 upup-py-2 upup-text-xs upup-text-yellow-400">
                        Content truncated - file is too large to preview in full.
                      </div>
                    ` : nothing}
                  ` : nothing}
                </div>
              `)}
              ${shouldRender(!isText, () => html`
                <object
                  data=${fileUrl}
                  width="100%"
                  height="100%"
                  name=${fileName}
                  title=${fileName}
                  type=${fileType}
                >
                  <p>${tr.loading}</p>
                </object>
              `)}
            `)}
          </div>
        </div>
      </div>
    </div>`
}
