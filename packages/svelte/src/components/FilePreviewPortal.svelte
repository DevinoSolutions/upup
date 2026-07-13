<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { formatUiMessage as t } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
  import { fileGetIsImage, fileGetIsPdf, fileGetIsText, PREVIEW_MAX_TEXT_SIZE, PREVIEW_TEXT_TRUNCATE_LENGTH } from '@upupjs/core/internal'
  import { useUploaderI18n, useUploaderTheme } from '../context/uploader-context'

  let {
    fileUrl,
    fileName,
    fileType,
    fileSize,
    onClose,
    onStopPropagation,
  }: {
    fileUrl: string
    fileName: string
    fileType: string
    fileSize?: number
    onClose: () => void
    onStopPropagation?: (e: MouseEvent) => void
  } = $props()

  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
  const { translations: tr } = useUploaderI18n()

  const isImage = $derived(fileGetIsImage(fileType))
  const isPdf = $derived(fileGetIsPdf(fileType, fileName))
  const isText = $derived(fileGetIsText(fileType, fileName))
  const isOversizedText = $derived(
    isText && fileSize !== undefined && fileSize > PREVIEW_MAX_TEXT_SIZE,
  )

  let textContent = $state('')
  let textLoading = $state(false)
  let textError = $state<string | undefined>(undefined)
  let isTruncated = $state(false)

  // Portal DOM node — SSR-safe: only accessed in onMount (client only)
  let portalEl: HTMLDivElement | null = null
  let containerEl: HTMLDivElement | null = $state(null)

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose()
  }

  async function loadText() {
    if (!isText) return
    try {
      textLoading = true
      if (isOversizedText) {
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
        isTruncated = wasTruncated
        textContent = result
      } else {
        const res = await fetch(fileUrl)
        textContent = await res.text()
      }
    } catch (e) {
      textError = (e as Error)?.message || 'Preview error'
    } finally {
      textLoading = false
    }
  }

  function onBackdropClick() {
    onClose()
  }

  function onContentClick(e: MouseEvent) {
    onStopPropagation?.(e)
    e.stopPropagation()
  }

  onMount(() => {
    // Create a wrapper div and move the rendered content into document.body (portal)
    portalEl = document.createElement('div')
    document.body.appendChild(portalEl)
    if (containerEl) portalEl.appendChild(containerEl)

    window.addEventListener('keydown', handleKeyDown)
    loadText()
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    if (portalEl && document.body.contains(portalEl)) {
      document.body.removeChild(portalEl)
    }
  })
</script>

<!-- Container rendered in-place initially; onMount moves it into document.body -->
<div bind:this={containerEl}>
  <div class="upup-scope" data-upup-slot="file-preview-portal">
    <div
      class="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={fileName}
      tabindex={-1}
      onclick={onBackdropClick}
      onkeydown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div class="upup-relative upup-h-[90vh] upup-w-[90vw] upup-p-4">
        <div
          class={cn(
            'upup-absolute upup-inset-0 upup-m-4 upup-bg-white',
            { 'upup-bg-[#232323] dark:upup-bg-[#232323]': $dark },
            $slotClasses.filePreviewPortal,
          )}
          role="presentation"
          onclick={onContentClick}
          onkeydown={undefined}
        >
          <button
            type="button"
            aria-label={tr.cancel}
            class="upup-absolute upup-right-3 upup-top-3 upup-z-10 upup-flex upup-size-8 upup-items-center upup-justify-center upup-rounded-full upup-bg-black/70 upup-text-sm upup-font-semibold upup-text-white upup-shadow-sm hover:upup-bg-black focus:upup-outline-none focus:upup-ring-2 focus:upup-ring-white"
            onclick={onClose}
          >
            x
          </button>

          {#if isImage}
            <img
              src={fileUrl}
              alt={fileName}
              class="upup-h-full upup-w-full upup-rounded upup-object-contain"
            />
          {/if}

          {#if isPdf}
            <embed
              src={fileUrl}
              type="application/pdf"
              width="100%"
              height="100%"
              class="upup-rounded"
              title={fileName}
            />
          {/if}

          {#if !isImage && !isPdf}
            {#if isText}
              <div class="upup-h-full upup-w-full upup-overflow-auto upup-p-4 upup-font-mono upup-text-xs">
                {#if textLoading}<p>{tr.loading}</p>{/if}
                {#if textError}<p>{t(tr.previewError, { message: textError })}</p>{/if}
                {#if !textLoading && !textError}
                  <pre class="upup-whitespace-pre-wrap">{textContent}</pre>
                  {#if isTruncated}
                    <div class="upup-mt-4 upup-rounded upup-border upup-border-yellow-500/30 upup-bg-yellow-500/10 upup-px-3 upup-py-2 upup-text-xs upup-text-yellow-400">
                      Content truncated - file is too large to preview in full.
                    </div>
                  {/if}
                {/if}
              </div>
            {/if}
            {#if !isText}
              <object
                data={fileUrl}
                width="100%"
                height="100%"
                name={fileName}
                title={fileName}
                type={fileType}
              >
                <p>{tr.loading}</p>
              </object>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
