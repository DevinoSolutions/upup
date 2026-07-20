<script lang="ts">
  import { useUploaderFiles, useUploaderI18n, useUploaderOptions, useUploaderRuntime, useUploaderSource, useUploaderTheme, useUploaderUploadControls, useUploaderView } from '../context/uploader-context'
  import { devinoDark, devinoLight, logoDark, logoLight } from '../assets/logos'
  import useUploaderPanel from '../composables/useUploaderPanel'
  import { cn } from '@upupjs/core/internal'
  import { UploadStatus, formatUiMessage } from '@upupjs/core'
  import SourceView from './SourceView.svelte'
  import SourceSelector from './SourceSelector.svelte'
  import FileList from './FileList.svelte'

  const { files } = useUploaderFiles()
  const { activeSource } = useUploaderSource()
  const { sourceOverlayOpen, sourceOverlayClosing, dropRejected, closeSourceOverlay } = useUploaderView()
  const { isOnline, motionMode } = useUploaderRuntime()
  const { translations: tr } = useUploaderI18n()
  const { isDark: dark } = useUploaderTheme()
  const { mini, showBranding } = useUploaderOptions()
  const { upload: { uploadStatus } } = useUploaderUploadControls()
  const { isDragging, absoluteIsDragging, absoluteHasBorder, handleDragOver, handleDragLeave, handleDrop, handlePaste } = useUploaderPanel()

  // The dashed dropzone frame is the idle-view affordance: shown only when the
  // panel is an empty, at-rest dropzone (no active source, no add-more flow, no
  // files). It supersedes the old pulsing CSS border.
  const showDropzoneFrame = $derived(
    $absoluteHasBorder && !$activeSource && !$sourceOverlayOpen && !$files.size,
  )

  // The add-more overlay: once files exist, the source surface slides up over the
  // still-mounted, dimmed file list, and stays mounted through the reverse
  // close-slide (`sourceOverlayClosing`).
  const hasFiles = $derived($files.size > 0)
  const showSourceOverlay = $derived(
    hasFiles && ($sourceOverlayOpen || $sourceOverlayClosing || !!$activeSource),
  )

  // Focus management (minimal — no focus trap; the dimmed list is `inert`).
  // On open (or an inner view swap) pull focus into the overlay so keyboard/SR
  // users don't land on the inert list underneath, capturing the trigger. On
  // settled close, restore focus to the trigger if it's still connected.
  let overlayEl: HTMLDivElement | null = $state(null)
  let triggerEl: HTMLElement | null = null

  $effect(() => {
    if (!($sourceOverlayOpen || $activeSource)) return
    const el = overlayEl
    if (!el) return
    if (!triggerEl && document.activeElement instanceof HTMLElement)
      triggerEl = document.activeElement
    el.querySelector<HTMLElement>('button:not([disabled])')?.focus()
  })

  $effect(() => {
    if ($sourceOverlayOpen || $sourceOverlayClosing || $activeSource) return
    const trigger = triggerEl
    if (!trigger) return
    triggerEl = null
    if (trigger.isConnected) trigger.focus()
  })

  // Polite screen-reader announcement for upload-lifecycle transitions. It is a
  // pure projection of uploadStatus (no new event plumbing).
  const uploadAnnouncement = $derived(
    $uploadStatus === UploadStatus.UPLOADING
      ? tr.announceUploadStarted
      : $uploadStatus === UploadStatus.SUCCESSFUL
        ? tr.announceUploadComplete
        : $uploadStatus === UploadStatus.FAILED
          ? tr.announceUploadFailed
          : '',
  )

  // Sheet swipe-to-dismiss state (plain vars — dragging must not re-render).
  let swipeStartY: number | null = null
  let swiped = false

  function onGripClick() {
    if (!swiped) closeSourceOverlay()
    swiped = false
  }
  function onGripPointerDown(e: PointerEvent) {
    swipeStartY = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onGripPointerMove(e: PointerEvent) {
    const startY = swipeStartY
    const sheet = overlayEl
    if (startY === null || !sheet) return
    const dy = Math.max(0, e.clientY - startY)
    sheet.style.transition = 'none'
    sheet.style.transform = `translateY(${dy}px)`
  }
  function onGripPointerUp(e: PointerEvent) {
    const startY = swipeStartY
    const sheet = overlayEl
    swipeStartY = null
    if (startY === null || !sheet) return
    const dy = Math.max(0, e.clientY - startY)
    sheet.style.transition = ''
    sheet.style.transform = ''
    if (dy > 72) {
      swiped = true
      closeSourceOverlay()
    }
  }

  function onOverlayKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !$sourceOverlayClosing) closeSourceOverlay()
  }
</script>

<div
  data-testid="upup-dropzone"
  data-upup-slot="uploader-panel"
  data-motion={$motionMode}
  role="region"
  aria-label={tr.dropzoneLabel}
  aria-dropeffect={$isDragging ? 'copy' : 'none'}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onpaste={handlePaste}
  class={cn('upup-relative upup-flex upup-flex-1 upup-flex-col upup-overflow-hidden upup-rounded-lg', {
    'upup-border upup-border-[#0ea5e9]': $absoluteHasBorder && !showDropzoneFrame,
    'upup-border-[#38bdf8] dark:upup-border-[#38bdf8]': $absoluteHasBorder && !showDropzoneFrame && $dark,
    'upup-border-dashed': !$isDragging && !showDropzoneFrame,
    'upup-bg-[#e0f2fe] upup-backdrop-blur-sm': $absoluteIsDragging && !$dark,
    'upup-bg-[#0b2a3a] upup-backdrop-blur-sm dark:upup-bg-[#0b2a3a]': $absoluteIsDragging && $dark,
  })}
>
  <div role="status" aria-live="polite" class="upup-sr-only">
    {uploadAnnouncement}
  </div>

  <!-- Drop-rejection toast: a file was dropped onto a read-only drive
       picker (core DragDropController → transient-UI store). Auto-clears
       after the store's 3s window drives an unmount — no JS timer here. -->
  {#if $dropRejected}
    <div
      data-testid="upup-drop-rejected-toast"
      data-upup-slot="drop-rejected-toast"
      role="status"
      aria-live="polite"
      class={cn(
        'upup-animate-informer-in upup-absolute upup-inset-x-4 upup-top-4 upup-z-30 upup-flex upup-items-center upup-gap-2.5 upup-rounded-xl upup-px-3.5 upup-py-2.5 upup-text-[13px] upup-leading-snug upup-ring-1',
        $dark
          ? 'upup-bg-rose-500/[0.14] upup-text-rose-200 upup-ring-rose-400/30'
          : 'upup-bg-rose-50 upup-text-rose-700 upup-ring-rose-300/60',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        class="upup-flex-none"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <span>
        {formatUiMessage(tr.dropRejected, { provider: $dropRejected })}
      </span>
    </div>
  {/if}

  {#if !$isOnline}
    <div class={cn('upup-absolute upup-inset-x-0 upup-top-0 upup-z-30 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500', { 'upup-bg-yellow-600': $dark })}>
      No internet connection — uploads will resume when you reconnect.
    </div>
  {/if}

  {#if showDropzoneFrame}
    <!-- An <svg> is a replaced element: absolute insets position it but do NOT
         stretch it (it keeps the 300x150 default), so the frame needs its size
         stated explicitly alongside its inset. Hugs the panel edge (4px) so the
         in-frame branding row has breathing room above the bottom dashes. -->
    <svg
      data-upup-slot="dropzone-frame"
      aria-hidden="true"
      class="upup-pointer-events-none upup-absolute upup-inset-1 upup-h-[calc(100%-0.5rem)] upup-w-[calc(100%-0.5rem)]"
    >
      <rect
        x="1"
        y="1"
        rx="14"
        ry="14"
        fill="none"
        stroke-width="1.5"
        stroke-dasharray="5 7"
        stroke={$dark
          ? ($absoluteIsDragging ? 'rgba(56,189,248,0.65)' : 'rgba(56,189,248,0.35)')
          : ($absoluteIsDragging ? 'rgba(2,132,199,0.7)' : 'rgba(2,132,199,0.4)')}
        class={cn($absoluteIsDragging && 'upup-animate-fx-dash-march')}
        style="width: calc(100% - 2px); height: calc(100% - 2px)"
      />
    </svg>
  {/if}

  <!-- Drag-over prompt: an explicit "drop it here" affordance (icon + text) so
       the drag state never reads as a mere glow. Pointer events pass through —
       the panel underneath owns the drop. -->
  {#if $absoluteIsDragging}
    <div
      data-testid="upup-drag-overlay"
      data-upup-slot="drag-overlay"
      aria-hidden="true"
      class={cn(
        'upup-animate-fx-view upup-pointer-events-none upup-absolute upup-inset-0 upup-z-10 upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-3',
        $dark ? 'upup-bg-[#0b1220]/70' : 'upup-bg-white/70',
      )}
    >
      <span
        class={cn(
          'upup-flex upup-h-16 upup-w-16 upup-items-center upup-justify-center upup-rounded-2xl',
          $dark
            ? 'upup-bg-[#38bdf8]/15 upup-text-[#38bdf8]'
            : 'upup-bg-[#0284c7]/10 upup-text-[#0284c7]',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          width="30"
          height="30"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 4v11" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
        </svg>
      </span>
      <span
        class={cn(
          'upup-text-[15px] upup-font-semibold',
          $dark ? 'upup-text-[#e2e8f0]' : 'upup-text-[#0f172a]',
        )}
      >
        {tr.dropToUpload}
      </span>
    </div>
  {/if}

  <!-- Content area (source surface / file list) flexes above the in-panel
       branding row so the dashed frame — inset-1 of this panel — wraps
       EVERYTHING including the brand, per the mock. -->
  <div class="upup-relative upup-flex upup-min-h-0 upup-flex-1 upup-flex-col">
    <!-- Idle primary: the source surface fills the panel when empty. -->
    {#if !hasFiles}
      {#if $activeSource}
        <SourceView />
      {:else}
        <SourceSelector />
      {/if}
    {/if}
    <FileList />
  </div>

  <!-- Add-more DRAWER (states-tour-v2 sheet): the source surface slides up as a
       translucent bottom sheet over the dimmed, still-mounted file list — the
       files stay visible behind it so nothing feels lost. Swipe the grip down
       (or Escape / the grip click) to close. -->
  {#if showSourceOverlay}
    <div
      bind:this={overlayEl}
      data-upup-slot="source-overlay"
      role={$sourceOverlayClosing ? undefined : 'dialog'}
      aria-modal={$sourceOverlayClosing ? undefined : 'true'}
      aria-label={tr.addingMoreFiles}
      class={cn(
        'upup-absolute upup-inset-x-3 upup-bottom-3 upup-top-11 upup-z-20 upup-flex upup-flex-col upup-overflow-hidden upup-rounded-2xl upup-ring-1 upup-ring-inset upup-backdrop-blur-md',
        $sourceOverlayClosing
          ? 'upup-fx-overlay-close-slide upup-pointer-events-none'
          : 'upup-fx-overlay-slide',
        $dark
          ? 'upup-bg-[#0b1220]/[0.85] upup-ring-white/[0.08] upup-shadow-[0_-18px_40px_-18px_rgba(0,0,0,0.65)]'
          : 'upup-bg-white/[0.85] upup-ring-black/[0.08] upup-shadow-[0_-18px_40px_-18px_rgba(15,23,42,0.25)]',
      )}
      onkeydown={onOverlayKeydown}
    >
      <!-- Sheet grip: click closes; drag down past the threshold closes
           (pointer capture — no transitionend reliance). -->
      <button
        type="button"
        data-testid="upup-sheet-grip"
        data-upup-slot="sheet-grip"
        aria-label={tr.overlayBack}
        class="upup-absolute upup-left-1/2 upup-top-1.5 upup-z-10 upup-flex upup-h-6 upup-w-20 upup--translate-x-1/2 upup-cursor-grab upup-touch-none upup-items-center upup-justify-center upup-rounded-full"
        onclick={onGripClick}
        onpointerdown={onGripPointerDown}
        onpointermove={onGripPointerMove}
        onpointerup={onGripPointerUp}
      >
        <span
          aria-hidden="true"
          class={cn(
            'upup-h-1 upup-w-10 upup-rounded-full',
            $dark ? 'upup-bg-white/20' : 'upup-bg-black/20',
          )}
        ></span>
      </button>
      {#if $activeSource}
        <SourceView />
      {:else}
        <SourceSelector />
      {/if}
    </div>
  {/if}

  <!-- Branding row INSIDE the panel (and the dashed frame). The add-more sheet
       slides over it, per the states-tour mock. Hidden while a source view is
       active — the drive browser / camera / url views own the full panel — and
       once files are selected: the file-list screen needs the vertical space
       (round-7 item 1). -->
  {#if !mini && showBranding && !$activeSource && !hasFiles}
    <div
      data-testid="upup-branding"
      class="upup-flex upup-w-full upup-flex-none upup-flex-col upup-items-center upup-justify-between upup-gap-1 upup-px-6 upup-pb-5 upup-pt-1.5 md:upup-flex-row"
    >
      <a
        href="https://useupup.com/"
        target="_blank"
        rel="noopener noreferrer"
        class="upup-flex upup-items-center upup-gap-[5px]"
      >
        {#if $dark}
          <img src={logoDark} width={61} height={13} alt="logo-dark" />
        {:else}
          <img src={logoLight} width={61} height={13} alt="logo-light" />
        {/if}
      </a>
      <a
        href="https://devino.ca/"
        target="_blank"
        rel="noopener noreferrer"
        class="upup-flex upup-flex-row upup-items-center upup-justify-end upup-gap-1"
      >
        <span
          class={cn(
            'upup-mr-0.5 upup-text-xs upup-leading-5 upup-text-[#6D6D6D] md:upup-text-sm',
            { 'upup-text-gray-300 dark:upup-text-gray-300': $dark },
          )}
        >
          {tr.builtBy}
        </span>
        {#if $dark}
          <img src={devinoDark} width={61} height={13} alt="logo-dark" />
        {:else}
          <img src={devinoLight} width={61} height={13} alt="logo-light" />
        {/if}
      </a>
    </div>
  {/if}
</div>
