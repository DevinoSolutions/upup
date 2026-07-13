<script lang="ts">
  import { onDestroy } from 'svelte'
  import {
    useUploaderFiles,
    useUploaderSource,
    useUploaderTheme,
  } from '../context/uploader-context'
  import { cn } from '@upupjs/core/internal'
  import SourceViewContainer from './shared/SourceViewContainer.svelte'

  type RecordingState = 'idle' | 'recording' | 'recorded'

  const { setFiles } = useUploaderFiles()
  const { setActiveSource } = useUploaderSource()
  const { isDark: dark } = useUploaderTheme()

  let recordingState: RecordingState = $state('idle')
  let duration = $state(0)
  let videoUrl: string | null = $state(null)
  let error: string | null = $state(null)

  let mediaRecorder: MediaRecorder | null = null
  const chunks: Blob[] = []
  let timerHandle: ReturnType<typeof setInterval> | null = null
  let streamRef: MediaStream | null = null
  let previewEl: HTMLVideoElement | null = null

  onDestroy(() => {
    if (timerHandle) clearInterval(timerHandle)
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    streamRef?.getTracks().forEach((t) => t.stop())
  })

  function bindPreview(node: HTMLVideoElement) {
    previewEl = node
    if (streamRef) {
      node.srcObject = streamRef
      void node.play()?.catch(() => {})
    }
    return {
      destroy() {
        if (previewEl === node) previewEl = null
      },
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      streamRef = stream
      chunks.length = 0

      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
          }
          if (timerHandle) clearInterval(timerHandle)
          recordingState = 'recorded'
        }
      }

      const recorder = new MediaRecorder(stream)
      mediaRecorder = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
        videoUrl = URL.createObjectURL(blob)
        stream.getTracks().forEach((t) => t.stop())
        if (previewEl) previewEl.srcObject = null
      }

      recorder.start()
      recordingState = 'recording'
      duration = 0
      timerHandle = setInterval(() => { duration++ }, 1000)
    } catch {
      error = 'Screen sharing was cancelled or denied. Please try again.'
    }
  }

  function stopRecording() {
    mediaRecorder?.stop()
    if (timerHandle) clearInterval(timerHandle)
    recordingState = 'recorded'
  }

  function discardRecording() {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    videoUrl = null
    duration = 0
    recordingState = 'idle'
  }

  function addRecording() {
    if (!videoUrl) return
    fetch(videoUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `screen-recording-${Date.now()}.webm`, { type: blob.type })
        setFiles([file])
        setActiveSource(undefined)
      })
      .catch(() => {
        // upup-catch: replaying an in-memory object URL cannot fail in practice; ignore
      })
  }

  function retryRecording() {
    error = null
    startRecording()
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }
</script>

{#if error}
  <!-- Error state -->
  <SourceViewContainer data-upup-slot="screen-capture-uploader">
    <div class="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center">
      <p
        class={cn('upup-text-sm upup-text-red-500', {
          'upup-text-red-400': $dark,
        })}
      >
        {error}
      </p>
      <button
        type="button"
        class={cn(
          'upup-rounded-lg upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
          {
            'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': $dark,
          },
        )}
        onclick={retryRecording}
      >
        Try Again
      </button>
    </div>
  </SourceViewContainer>
{:else}
  <!-- Normal state -->
  <SourceViewContainer data-upup-slot="screen-capture-uploader">
    <div class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-4">
      <!-- Idle -->
      {#if recordingState === 'idle'}
        <div class="upup-flex upup-flex-col upup-items-center upup-gap-4">
          <div class="upup-flex upup-h-20 upup-w-20 upup-items-center upup-justify-center upup-rounded-full upup-bg-blue-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke={$dark ? '#59D1F9' : '#2563eb'}
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect width="20" height="15" x="2" y="3" rx="2" />
              <polyline points="8 21 16 21" />
              <line x1="12" x2="12" y1="18" y2="21" />
            </svg>
          </div>
          <button
            type="button"
            class={cn(
              'upup-rounded-lg upup-bg-blue-600 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700',
              {
                'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]': $dark,
              },
            )}
            onclick={startRecording}
          >
            Share Screen
          </button>
        </div>
      {/if}

      <!-- Recording -->
      {#if recordingState === 'recording'}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          use:bindPreview
          muted
          class="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
        ></video>
        <div class="upup-flex upup-items-center upup-gap-3">
          <span class="upup-h-3 upup-w-3 upup-animate-pulse upup-rounded-full upup-bg-red-500"></span>
          <span
            class={cn(
              'upup-font-mono upup-text-lg upup-tabular-nums',
              {
                'upup-text-[#1b1b1b]': !$dark,
                'upup-text-white': $dark,
              },
            )}
          >
            {formatTime(duration)}
          </span>
        </div>
        <button
          type="button"
          class="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
          onclick={stopRecording}
        >
          Stop Recording
        </button>
      {/if}

      <!-- Recorded -->
      {#if recordingState === 'recorded' && videoUrl}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          controls
          src={videoUrl}
          class="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
        ></video>
        <div class="upup-flex upup-gap-3">
          <button
            type="button"
            class="upup-rounded-lg upup-bg-gray-500 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-gray-600"
            onclick={discardRecording}
          >
            Discard
          </button>
          <button
            type="button"
            class={cn(
              'upup-rounded-lg upup-bg-blue-600 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700',
              {
                'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]': $dark,
              },
            )}
            onclick={addRecording}
          >
            Add Recording
          </button>
        </div>
      {/if}
    </div>
  </SourceViewContainer>
{/if}
