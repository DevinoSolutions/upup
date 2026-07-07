<script lang="ts">
  import { onDestroy } from 'svelte'
  import {
    useUploaderFiles,
    useUploaderSource,
    useUploaderTheme,
  } from '../context/uploader-context'
  import { cn } from '@upup/core/internal'
  import SourceViewContainer from './shared/SourceViewContainer.svelte'

  type RecordingState = 'idle' | 'recording' | 'recorded'

  const { setFiles } = useUploaderFiles()
  const { setActiveSource } = useUploaderSource()
  const { isDark: dark } = useUploaderTheme()

  let recordingState: RecordingState = $state('idle')
  let duration = $state(0)
  let audioUrl: string | null = $state(null)
  let error: string | null = $state(null)

  let mediaRecorder: MediaRecorder | null = null
  const chunks: Blob[] = []
  let timerHandle: ReturnType<typeof setInterval> | null = null
  let streamRef: MediaStream | null = null

  onDestroy(() => {
    if (timerHandle) clearInterval(timerHandle)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    streamRef?.getTracks().forEach((t) => t.stop())
  })

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef = stream
      chunks.length = 0
      const recorder = new MediaRecorder(stream)
      mediaRecorder = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        audioUrl = URL.createObjectURL(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start()
      recordingState = 'recording'
      duration = 0
      timerHandle = setInterval(() => { duration++ }, 1000)
    } catch {
      error = 'Microphone access denied. Please allow microphone access and try again.'
    }
  }

  function stopRecording() {
    mediaRecorder?.stop()
    if (timerHandle) clearInterval(timerHandle)
    recordingState = 'recorded'
  }

  function discardRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    audioUrl = null
    duration = 0
    recordingState = 'idle'
  }

  function addRecording() {
    if (!audioUrl) return
    const ext = mediaRecorder?.mimeType?.includes('webm') ? 'webm' : 'ogg'
    fetch(audioUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: blob.type })
        setFiles([file])
        setActiveSource(undefined)
      })
      .catch(() => {
        // upup-catch: replaying an in-memory object URL cannot fail in practice; ignore
      })
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }
</script>

{#if error}
  <!-- Error state -->
  <SourceViewContainer data-upup-slot="audio-uploader">
    <div class="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center">
      <p
        class={cn('upup-text-sm upup-text-red-500', {
          'upup-text-red-400': $dark,
        })}
      >
        {error}
      </p>
    </div>
  </SourceViewContainer>
{:else}
  <!-- Normal state -->
  <SourceViewContainer data-upup-slot="audio-uploader">
    <div class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-6 upup-p-6">
      <div
        class={cn(
          'upup-flex upup-h-24 upup-w-24 upup-items-center upup-justify-center upup-rounded-full',
          {
            'upup-bg-red-500/20': recordingState === 'recording',
            'upup-bg-blue-500/20': recordingState === 'idle' || recordingState === 'recorded',
          },
        )}
      >
        <div
          class={cn(
            'upup-flex upup-h-16 upup-w-16 upup-items-center upup-justify-center upup-rounded-full upup-transition-all',
            {
              'upup-animate-pulse upup-bg-red-500': recordingState === 'recording',
              'upup-bg-blue-500': recordingState === 'idle' || recordingState === 'recorded',
            },
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>
      </div>

      <span
        class={cn(
          'upup-text-2xl upup-font-mono upup-tabular-nums',
          {
            'upup-text-[#1b1b1b]': !$dark,
            'upup-text-white': $dark,
          },
        )}
      >
        {formatTime(duration)}
      </span>

      {#if recordingState === 'recorded' && audioUrl}
        <!-- svelte-ignore a11y_media_has_caption -->
        <audio controls src={audioUrl} class="upup-w-full upup-max-w-xs"></audio>
      {/if}

      <div class="upup-flex upup-gap-3">
        {#if recordingState === 'idle'}
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
            Start Recording
          </button>
        {/if}

        {#if recordingState === 'recording'}
          <button
            type="button"
            class="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
            onclick={stopRecording}
          >
            Stop Recording
          </button>
        {/if}

        {#if recordingState === 'recorded'}
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
        {/if}
      </div>
    </div>
  </SourceViewContainer>
{/if}
