<script lang="ts">
  import { cn } from '@upupjs/core/internal'
  import {
    UploadStatus,
    fileTypeIconName,
    type IconName,
    type UploadFile,
    type Translations,
  } from '@upupjs/core'
  import { fileGetExtension, fileGetIsImage } from '@upupjs/core/internal'
  import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
  } from '../context/uploader-context'
  import Icon from './Icon.svelte'
  import ProgressBar from './shared/ProgressBar.svelte'
  import FileSuccessCheck from './shared/FileSuccessCheck.svelte'

  const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'])

  /**
   * Per-category thumbnail treatment for non-media rows so pdf / archive / audio /
   * generic no longer all read as the same blue doc: a distinct gradient tint plus
   * the type-specific glyph (audio uses the waveform icon; the rest use the
   * file-<ext> registry icon, falling back to the generic file glyph).
   */
  function nonMediaThumb(
    type: string,
    name: string,
  ): { gradient: string; icon: IconName } {
    const ext = fileGetExtension(type, name)
    if (type.startsWith('audio/'))
      return {
        gradient: 'linear-gradient(135deg,#a855f7,#6366f1)',
        icon: 'audio',
      }
    if (ext === 'pdf' || type === 'application/pdf')
      return {
        gradient: 'linear-gradient(135deg,#f43f5e,#ec4899)',
        icon: 'file-pdf',
      }
    if (ARCHIVE_EXTENSIONS.has(ext) || type.includes('zip'))
      return {
        gradient: 'linear-gradient(135deg,#f59e0b,#f97316)',
        icon: fileTypeIconName(ext === 'zip' ? 'zip' : ext),
      }
    return {
      gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
      icon: fileTypeIconName(ext),
    }
  }

  /**
   * Compact list-mode row (spec §4 state 3, states-tour-v2.html "multiple files").
   * A horizontal card: thumbnail · name/size · remove. The grid-mode tile
   * (FilePreview) keeps the richer affordances (edit, click-to-preview); the row
   * is the dense overview and matches the mockup exactly.
   */
  let {
    file,
    index = 0,
  }: {
    file: UploadFile
    /** Position in the sorted list — drives the completion-check stagger. */
    index?: number
  } = $props()

  const { handleFileRemove } = useUploaderFiles()
  const { translations: tr } = useUploaderI18n()
  const { icons: { FileDeleteIcon } } = useUploaderOptions()
  const { isDark: dark } = useUploaderTheme()
  const { upload: { filesProgressMap } } = useUploaderUploadControls()

  const type = $derived(file.type ?? '')
  const isImage = $derived(fileGetIsImage(type))
  const isVideo = $derived(type.startsWith('video/'))
  const isSuccessful = $derived(file.status === UploadStatus.SUCCESSFUL)
  const thumb = $derived(nonMediaThumb(type, file.name))
  const thumbStyle = $derived(
    isImage
      ? `background-image: url(${file.url ?? ''})`
      : isVideo
        ? undefined
        : `background: ${thumb.gradient}`,
  )
  const progress = $derived.by(() => {
    const p = $filesProgressMap[file.id]
    const loaded = p?.loaded ?? NaN
    const total = p?.total ?? NaN
    const pct = Math.floor((loaded / total) * 100)
    // No progress entry ⇒ NaN; total === 0 ⇒ Infinity. Either would render
    // width:NaN%/aria-valuenow=NaN in ProgressBar while an upload is active.
    return Number.isFinite(pct) ? pct : 0
  })

  function formatFileSize(bytes: number | undefined, t: Translations): string {
    if (!bytes || bytes === 0) return t.zeroBytes
    const k = 1024
    const sizes = [t.bytes, t.kb, t.mb, t.gb]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
  }

  function onRemove(e: MouseEvent) {
    e.stopPropagation()
    handleFileRemove(file.id)
  }
</script>

<div
  class={cn(
    'upup-fx-hover-lift upup-flex upup-w-full upup-items-center upup-gap-3 upup-rounded-xl upup-px-3 upup-py-2.5 upup-ring-1',
    $dark
      ? 'upup-bg-white/[0.04] upup-ring-white/[0.07]'
      : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
  )}
>
  <div
    class="upup-relative upup-flex upup-h-10 upup-w-10 upup-flex-none upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-[9px] upup-bg-center upup-bg-cover upup-bg-no-repeat"
    style={thumbStyle}
  >
    {#if isVideo}
      <!-- Real first-frame video thumbnail (no controls chrome). Uses the
           local object URL, which persists through upload (updateFile keeps
           `url`), so the preview survives a completed run. -->
      <video
        src={file.url ?? ''}
        muted
        playsinline
        preload="metadata"
        class="upup-pointer-events-none upup-absolute upup-inset-0 upup-h-full upup-w-full upup-object-cover"
      ></video>
    {:else if !isImage}
      <Icon name={thumb.icon} size={20} class="upup-text-white" />
    {/if}
  </div>

  <div class="upup-flex upup-min-w-0 upup-flex-1 upup-flex-col upup-gap-0.5">
    <div
      class={cn(
        'upup-truncate upup-text-[13px]',
        $dark ? 'upup-text-[#e2e8f0]' : 'upup-text-gray-900',
      )}
    >
      {file.name}
    </div>
    <div
      class={cn(
        'upup-text-[12px]',
        $dark ? 'upup-text-[#94a3b8]' : 'upup-text-gray-500',
      )}
    >
      {formatFileSize(file.size, tr)}
    </div>
    {#if !!progress}
      <ProgressBar
        class="upup-mt-1"
        progressBarClassName="upup-rounded"
        {progress}
        showValue
      />
    {/if}
  </div>

  {#if isSuccessful}
    <FileSuccessCheck {index} size={22} class="upup-flex-none" />
  {/if}

  <!-- Once a file has uploaded successfully its delete control is gone —
       the completion check is the only trailing affordance. -->
  {#if !isSuccessful}
    <button
      class={cn(
        'upup-fx-remove upup-fx-press upup-flex upup-h-8 upup-w-8 upup-flex-none upup-items-center upup-justify-center upup-rounded-lg',
        $dark
          ? 'upup-text-[#64748b] hover:upup-bg-white/[0.06]'
          : 'upup-text-gray-500 hover:upup-bg-black/[0.06]',
        'disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
      )}
      onclick={onRemove}
      type="button"
      disabled={!!progress}
      aria-label={tr.removeFile}
      data-testid="upup-file-remove"
    >
      <FileDeleteIcon class="upup-h-5 upup-w-5" />
    </button>
  {/if}
</div>
