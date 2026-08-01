<script lang="ts">
  import { cn } from '@upupjs/core/internal'
  import { UploadStatus, type UploadFile, type Translations } from '@upupjs/core'
  import { fileGetExtension, fileGetIsImage } from '@upupjs/core/internal'
  import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
    useUploaderUploadControls,
  } from '../context/uploader-context'
  import FileIcon from './FileIcon.svelte'
  import ProgressBar from './shared/ProgressBar.svelte'
  import FileSuccessCheck from './shared/FileSuccessCheck.svelte'

  /**
   * Single-file HERO preview (spec §4 state 3, states-tour-v2.html "single file").
   * One visual fills the fixed-height content area with a bottom scrim caption.
   * The panel is fixed-height by ruling, so the media MUST stay bounded with
   * `min-h-0 flex-1 object-contain` — the repo's #1 visual trap.
   */
  let { file }: { file: UploadFile } = $props()

  const { handleFileRemove } = useUploaderFiles()
  const { translations: tr } = useUploaderI18n()
  const { icons: { FileDeleteIcon } } = useUploaderOptions()
  const { isDark: dark } = useUploaderTheme()
  const { upload: { filesProgressMap } } = useUploaderUploadControls()

  const isImage = $derived(fileGetIsImage(file.type ?? ''))
  const isVideo = $derived((file.type ?? '').startsWith('video/'))
  const extension = $derived(fileGetExtension(file.type ?? '', file.name))
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
  data-testid="upup-file-hero"
  data-upup-slot="file-hero"
  role="listitem"
  class={cn(
    'upup-relative upup-flex upup-min-h-0 upup-flex-1 upup-flex-col upup-overflow-hidden upup-rounded-2xl upup-ring-1',
    $dark
      ? 'upup-bg-white/[0.03] upup-ring-white/[0.08]'
      : 'upup-bg-black/[0.04] upup-ring-black/[0.06]',
  )}
>
  {#if isImage}
    <img
      src={file.url ?? ''}
      alt={file.name}
      class="upup-min-h-0 upup-flex-1 upup-object-contain"
    />
  {:else if isVideo}
    <!-- preload="metadata" paints the first frame — a real thumbnail without
         controls chrome. Muted + playsInline keep mobile browsers from
         hijacking it into a player. -->
    <video
      src={file.url ?? ''}
      muted
      playsinline
      preload="metadata"
      class="upup-pointer-events-none upup-min-h-0 upup-flex-1 upup-object-contain"
    ></video>
  {:else}
    <div
      class="upup-flex upup-min-h-0 upup-flex-1 upup-items-center upup-justify-center upup-bg-gradient-to-br upup-from-[#0ea5e9]/10 upup-to-[#7c3aed]/10"
    >
      <FileIcon {extension} />
    </div>
  {/if}

  {#if file.status === UploadStatus.SUCCESSFUL}
    <FileSuccessCheck class="upup-absolute upup-left-3 upup-top-3 upup-z-10" />
  {/if}

  <!-- Delete is gone once the file has uploaded successfully — the
       completion check (top-left) is the only remaining overlay mark. -->
  {#if file.status !== UploadStatus.SUCCESSFUL}
    <button
      class={cn(
        'upup-fx-remove upup-fx-press upup-absolute upup-right-3 upup-top-3 upup-z-10',
        'upup-flex upup-h-[34px] upup-w-[34px] upup-items-center upup-justify-center',
        'upup-rounded-[9px] upup-bg-[#04080f]/40 upup-text-[#e2e8f0]',
        'hover:upup-bg-[#04080f]/65',
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

  <!-- Caption scrim: theme-aware (a black scrim over a light hero read as
       a dark-mode leak). The progress bar lives INSIDE the scrim flow so
       it can never overlap the name/size lines. -->
  <div
    class={cn(
      'upup-pointer-events-none upup-absolute upup-inset-x-0 upup-bottom-0 upup-bg-gradient-to-t upup-to-transparent upup-px-[18px] upup-pb-3.5 upup-pt-4',
      $dark
        ? 'upup-from-[#04080f]/[0.86] upup-via-[#04080f]/50'
        : 'upup-from-white/[0.92] upup-via-white/60',
    )}
  >
    <div
      class={cn(
        'upup-truncate upup-text-[13px] upup-font-semibold',
        $dark ? 'upup-text-[#e2e8f0]' : 'upup-text-[#1e293b]',
      )}
    >
      {file.name}
    </div>
    <div
      class={cn(
        'upup-mt-0.5 upup-text-[12px]',
        $dark ? 'upup-text-[#94a3b8]' : 'upup-text-[#64748b]',
      )}
    >
      {formatFileSize(file.size, tr)}
    </div>
    <ProgressBar
      class={cn('upup-mt-2', $dark ? 'upup-text-white' : 'upup-text-[#0f172a]')}
      progressBarClassName="upup-rounded"
      {progress}
      showValue
    />
  </div>
</div>
