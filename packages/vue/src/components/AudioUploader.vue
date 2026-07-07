<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
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
const audioUrl = ref<string | null>(null)
const error = ref<string | null>(null)

const mediaRecorder = ref<MediaRecorder | null>(null)
const chunks: Blob[] = []
const timerRef = ref<ReturnType<typeof setInterval> | null>(null)
const streamRef = ref<MediaStream | null>(null)

onUnmounted(() => {
    if (timerRef.value) clearInterval(timerRef.value)
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
    streamRef.value?.getTracks().forEach(t => t.stop())
})

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.value = stream
        chunks.length = 0
        const recorder = new MediaRecorder(stream)
        mediaRecorder.value = recorder

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data)
        }

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
            audioUrl.value = URL.createObjectURL(blob)
            stream.getTracks().forEach(t => t.stop())
        }

        recorder.start()
        state.value = 'recording'
        duration.value = 0
        timerRef.value = setInterval(() => { duration.value++ }, 1000)
    } catch {
        error.value = 'Microphone access denied. Please allow microphone access and try again.'
    }
}

function stopRecording() {
    mediaRecorder.value?.stop()
    if (timerRef.value) clearInterval(timerRef.value)
    state.value = 'recorded'
}

function discardRecording() {
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = null
    duration.value = 0
    state.value = 'idle'
}

function addRecording() {
    if (!audioUrl.value) return
    const ext = mediaRecorder.value?.mimeType?.includes('webm') ? 'webm' : 'ogg'
    fetch(audioUrl.value)
        .then(r => r.blob())
        .then(blob => {
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

<template>
    <!-- Error state -->
    <SourceViewContainer v-if="error" data-upup-slot="audio-uploader">
        <div class="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center">
            <p
                :class="cn('upup-text-sm upup-text-red-500', {
                    'upup-text-red-400': dark,
                })"
            >
                {{ error }}
            </p>
        </div>
    </SourceViewContainer>

    <!-- Normal state -->
    <SourceViewContainer v-else data-upup-slot="audio-uploader">
        <div class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-6 upup-p-6">
            <div
                :class="cn(
                    'upup-flex upup-h-24 upup-w-24 upup-items-center upup-justify-center upup-rounded-full',
                    {
                        'upup-bg-red-500/20': state === 'recording',
                        'upup-bg-blue-500/20': state === 'idle' || state === 'recorded',
                    },
                )"
            >
                <div
                    :class="cn(
                        'upup-flex upup-h-16 upup-w-16 upup-items-center upup-justify-center upup-rounded-full upup-transition-all',
                        {
                            'upup-animate-pulse upup-bg-red-500': state === 'recording',
                            'upup-bg-blue-500': state === 'idle' || state === 'recorded',
                        },
                    )"
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
                :class="cn(
                    'upup-text-2xl upup-font-mono upup-tabular-nums',
                    {
                        'upup-text-[#1b1b1b]': !dark,
                        'upup-text-white': dark,
                    },
                )"
            >
                {{ formatTime(duration) }}
            </span>

            <audio
                v-if="state === 'recorded' && audioUrl"
                controls
                :src="audioUrl"
                class="upup-w-full upup-max-w-xs"
            />

            <div class="upup-flex upup-gap-3">
                <button
                    v-if="state === 'idle'"
                    type="button"
                    :class="cn(
                        'upup-rounded-lg upup-bg-blue-600 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700',
                        {
                            'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]': dark,
                        },
                    )"
                    @click="startRecording"
                >
                    Start Recording
                </button>

                <button
                    v-if="state === 'recording'"
                    type="button"
                    class="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
                    @click="stopRecording"
                >
                    Stop Recording
                </button>

                <template v-if="state === 'recorded'">
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
                </template>
            </div>
        </div>
    </SourceViewContainer>
</template>
