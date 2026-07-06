<script setup lang="ts">
import { onUnmounted, ref, type ComponentPublicInstance } from 'vue'
import {
    useUploaderFiles,
    useUploaderSource,
    useUploaderTheme,
} from '../context/uploader-context'
import { cn } from '@upup/core/internal'
import SourceViewContainer from './shared/SourceViewContainer.vue'

type RecordingState = 'idle' | 'recording' | 'recorded'

const { setFiles } = useUploaderFiles()
const { setActiveSource } = useUploaderSource()
const { isDark: dark } = useUploaderTheme()

const state = ref<RecordingState>('idle')
const duration = ref(0)
const videoUrl = ref<string | null>(null)
const error = ref<string | null>(null)

const mediaRecorder = ref<MediaRecorder | null>(null)
const chunks: Blob[] = []
const timerRef = ref<ReturnType<typeof setInterval> | null>(null)
const streamRef = ref<MediaStream | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
let previewRef: HTMLVideoElement | null = null

onUnmounted(() => {
    if (timerRef.value) clearInterval(timerRef.value)
    if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
    streamRef.value?.getTracks().forEach(t => t.stop())
})

function bindPreview(el: Element | ComponentPublicInstance | null) {
    const video = el instanceof HTMLVideoElement ? el : null
    previewRef = video
    // Vue invokes a function ref on every component update, and the recording
    // timer re-renders this view once per second. Guard so we bind srcObject +
    // play() once per mount, not every tick — re-assigning srcObject restarts
    // the media element's load algorithm and visibly flickers the preview.
    if (video && streamRef.value && video.srcObject !== streamRef.value) {
        video.srcObject = streamRef.value
        void video.play()?.catch(() => {})
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        })
        streamRef.value = stream
        chunks.length = 0

        const [videoTrack] = stream.getVideoTracks()
        if (videoTrack) {
            videoTrack.onended = () => {
                if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
                    mediaRecorder.value.stop()
                }
                if (timerRef.value) clearInterval(timerRef.value)
                state.value = 'recorded'
            }
        }

        const recorder = new MediaRecorder(stream)
        mediaRecorder.value = recorder

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data)
        }

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
            videoUrl.value = URL.createObjectURL(blob)
            stream.getTracks().forEach(t => t.stop())
            if (previewRef) previewRef.srcObject = null
        }

        recorder.start()
        state.value = 'recording'
        duration.value = 0
        timerRef.value = setInterval(() => { duration.value++ }, 1000)
    } catch {
        error.value = 'Screen sharing was cancelled or denied. Please try again.'
    }
}

function stopRecording() {
    mediaRecorder.value?.stop()
    if (timerRef.value) clearInterval(timerRef.value)
    state.value = 'recorded'
}

function discardRecording() {
    if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
    videoUrl.value = null
    duration.value = 0
    state.value = 'idle'
}

function addRecording() {
    if (!videoUrl.value) return
    fetch(videoUrl.value)
        .then(r => r.blob())
        .then(blob => {
            const file = new File([blob], `screen-recording-${Date.now()}.webm`, { type: blob.type })
            setFiles([file])
            setActiveSource(undefined)
        })
}

function retryRecording() {
    error.value = null
    startRecording()
}

function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
}
</script>

<template>
    <!-- Error state -->
    <SourceViewContainer v-if="error" data-upup-slot="screen-capture-uploader">
        <div class="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center">
            <p
                :class="cn('upup-text-sm upup-text-red-500', {
                    'upup-text-red-400': dark,
                })"
            >
                {{ error }}
            </p>
            <button
                type="button"
                :class="cn(
                    'upup-rounded-lg upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                    {
                        'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': dark,
                    },
                )"
                @click="retryRecording"
            >
                Try Again
            </button>
        </div>
    </SourceViewContainer>

    <!-- Normal state -->
    <SourceViewContainer v-else data-upup-slot="screen-capture-uploader">
        <div class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-4">
            <!-- Idle -->
            <div v-if="state === 'idle'" class="upup-flex upup-flex-col upup-items-center upup-gap-4">
                <div class="upup-flex upup-h-20 upup-w-20 upup-items-center upup-justify-center upup-rounded-full upup-bg-blue-500/20">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        :stroke="dark ? '#59D1F9' : '#2563eb'"
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
                    :class="cn(
                        'upup-rounded-lg upup-bg-blue-600 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700',
                        {
                            'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]': dark,
                        },
                    )"
                    @click="startRecording"
                >
                    Share Screen
                </button>
            </div>

            <!-- Recording -->
            <template v-if="state === 'recording'">
                <video
                    :ref="bindPreview"
                    muted
                    class="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
                />
                <div class="upup-flex upup-items-center upup-gap-3">
                    <span class="upup-h-3 upup-w-3 upup-animate-pulse upup-rounded-full upup-bg-red-500" />
                    <span
                        :class="cn(
                            'upup-font-mono upup-text-lg upup-tabular-nums',
                            {
                                'upup-text-[#1b1b1b]': !dark,
                                'upup-text-white': dark,
                            },
                        )"
                    >
                        {{ formatTime(duration) }}
                    </span>
                </div>
                <button
                    type="button"
                    class="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
                    @click="stopRecording"
                >
                    Stop Recording
                </button>
            </template>

            <!-- Recorded -->
            <template v-if="state === 'recorded' && videoUrl">
                <video
                    ref="videoRef"
                    controls
                    :src="videoUrl"
                    class="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
                />
                <div class="upup-flex upup-gap-3">
                    <button
                        type="button"
                        class="upup-rounded-lg upup-bg-gray-500 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-gray-600"
                        @click="discardRecording"
                    >
                        Discard
                    </button>
                    <button
                        type="button"
                        :class="cn(
                            'upup-rounded-lg upup-bg-blue-600 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700',
                            {
                                'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]': dark,
                            },
                        )"
                        @click="addRecording"
                    >
                        Add Recording
                    </button>
                </div>
            </template>
        </div>
    </SourceViewContainer>
</template>
