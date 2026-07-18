<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
} from '../context/uploader-context'
import useUploaderPanel from '../composables/useUploaderPanel'
import { cn } from '@upupjs/core/internal'
import { UploadStatus, formatUiMessage } from '@upupjs/core'
import SourceSelector from './SourceSelector.vue'
import SourceView from './SourceView.vue'
import FileList from './FileList.vue'

const { files } = useUploaderFiles()
const { activeSource } = useUploaderSource()
const { sourceOverlayOpen, sourceOverlayClosing, dropRejected } = useUploaderView()
const { isOnline, motionMode } = useUploaderRuntime()
const { translations: tr } = useUploaderI18n()
const { isDark: dark } = useUploaderTheme()
const {
    upload: { uploadStatus },
} = useUploaderUploadControls()
const {
    isDragging,
    absoluteIsDragging,
    absoluteHasBorder,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
} = useUploaderPanel()

// The dashed dropzone frame is the idle-view affordance: shown only when the
// panel is an empty, at-rest dropzone (no active source, no add-more flow, no
// files). It supersedes the old pulsing CSS border.
const showDropzoneFrame = computed(
    () =>
        absoluteHasBorder.value &&
        !activeSource.value &&
        !sourceOverlayOpen.value &&
        !files.value.size,
)

// The add-more overlay: once files exist, the source surface slides up over the
// still-mounted, dimmed file list, and stays mounted through the reverse
// close-slide (`sourceOverlayClosing`).
const hasFiles = computed(() => files.value.size > 0)
const showSourceOverlay = computed(
    () =>
        hasFiles.value &&
        (sourceOverlayOpen.value || sourceOverlayClosing.value || !!activeSource.value),
)

const dropEffect = computed(() => (isDragging.value ? 'copy' : 'none'))

// Focus management (minimal — no focus trap; the dimmed list is `inert`).
// On open (or an inner view swap) pull focus into the overlay so keyboard/SR
// users don't land on the inert list underneath, capturing the trigger. On
// settled close, restore focus to the trigger if it's still connected.
const overlayRef = ref<HTMLDivElement | null>(null)
let triggerEl: HTMLElement | null = null

watch(
    [sourceOverlayOpen, activeSource],
    () => {
        if (!(sourceOverlayOpen.value || activeSource.value)) return
        void nextTick(() => {
            const overlayEl = overlayRef.value
            if (!overlayEl) return
            if (!triggerEl && document.activeElement instanceof HTMLElement)
                triggerEl = document.activeElement
            overlayEl
                .querySelector<HTMLElement>('button:not([disabled])')
                ?.focus()
        })
    },
)
watch(
    [sourceOverlayOpen, sourceOverlayClosing, activeSource],
    () => {
        if (
            sourceOverlayOpen.value ||
            sourceOverlayClosing.value ||
            activeSource.value
        )
            return
        const trigger = triggerEl
        if (!trigger) return
        triggerEl = null
        if (trigger.isConnected) trigger.focus()
    },
)
</script>

<template>
    <div
        data-testid="upup-dropzone"
        data-upup-slot="uploader-panel"
        :data-motion="motionMode"
        role="region"
        :aria-label="tr.dropzoneLabel"
        :aria-dropeffect="dropEffect"
        :class="
            cn(
                'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg',
                {
                    'upup-border upup-border-[#0ea5e9]':
                        absoluteHasBorder && !showDropzoneFrame,
                    'upup-border-[#38bdf8] dark:upup-border-[#38bdf8]':
                        absoluteHasBorder && !showDropzoneFrame && dark,
                    'upup-border-dashed': !isDragging && !showDropzoneFrame,
                    'upup-bg-[#e0f2fe] upup-backdrop-blur-sm':
                        absoluteIsDragging && !dark,
                    'upup-bg-[#0b2a3a] upup-backdrop-blur-sm dark:upup-bg-[#0b2a3a]':
                        absoluteIsDragging && dark,
                },
            )
        "
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @paste="handlePaste"
    >
        <div role="status" aria-live="polite" class="upup-sr-only">
            {{
                uploadStatus === UploadStatus.UPLOADING
                    ? tr.announceUploadStarted
                    : uploadStatus === UploadStatus.SUCCESSFUL
                      ? tr.announceUploadComplete
                      : uploadStatus === UploadStatus.FAILED
                        ? tr.announceUploadFailed
                        : ''
            }}
        </div>

        <!-- Drop-rejection toast: a file was dropped onto a read-only drive
             picker (core DragDropController → transient-UI store). Auto-clears
             after the store's 3s window drives an unmount — no JS timer here. -->
        <template v-if="dropRejected">
            <div
                data-testid="upup-drop-rejected-toast"
                data-upup-slot="drop-rejected-toast"
                role="status"
                aria-live="polite"
                :class="cn(
                    'upup-animate-informer-in upup-absolute upup-inset-x-4 upup-top-4 upup-z-30 upup-flex upup-items-center upup-gap-2.5 upup-rounded-xl upup-px-3.5 upup-py-2.5 upup-text-[13px] upup-leading-snug upup-ring-1',
                    dark
                        ? 'upup-bg-rose-500/[0.14] upup-text-rose-200 upup-ring-rose-400/30'
                        : 'upup-bg-rose-50 upup-text-rose-700 upup-ring-rose-300/60',
                )"
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
                    {{ formatUiMessage(tr.dropRejected, { provider: dropRejected }) }}
                </span>
            </div>
        </template>

        <template v-if="!isOnline">
            <div
                :class="
                    cn(
                        'upup-absolute upup-inset-x-0 upup-top-0 upup-z-30 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
                        { 'upup-bg-yellow-600': dark },
                    )
                "
            >
                No internet connection — uploads will resume when you reconnect.
            </div>
        </template>

        <template v-if="showDropzoneFrame">
            <!-- An <svg> is a replaced element: absolute insets position it but
                 do NOT stretch it (it keeps the 300x150 default), so the frame
                 needs its size stated explicitly alongside inset-3. -->
            <svg
                data-upup-slot="dropzone-frame"
                aria-hidden="true"
                class="upup-pointer-events-none upup-absolute upup-inset-3 upup-h-[calc(100%-1.5rem)] upup-w-[calc(100%-1.5rem)]"
            >
                <rect
                    x="1"
                    y="1"
                    rx="14"
                    ry="14"
                    fill="none"
                    stroke-width="1.5"
                    stroke-dasharray="6 6"
                    :stroke="
                        dark
                            ? absoluteIsDragging
                                ? 'rgba(56,189,248,0.65)'
                                : 'rgba(56,189,248,0.35)'
                            : absoluteIsDragging
                              ? 'rgba(2,132,199,0.7)'
                              : 'rgba(2,132,199,0.4)'
                    "
                    class="upup-animate-fx-dash-march"
                    :style="{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }"
                />
            </svg>
        </template>

        <!-- Idle primary: the source surface fills the panel when empty. -->
        <template v-if="!hasFiles">
            <SourceView v-if="activeSource" />
            <SourceSelector v-else />
        </template>

        <!-- Add-more overlay: the source surface slides up over the dimmed,
             still-mounted file list — nothing unmounts, no state is lost. -->
        <template v-if="showSourceOverlay">
            <div
                ref="overlayRef"
                data-upup-slot="source-overlay"
                :role="sourceOverlayClosing ? undefined : 'dialog'"
                :aria-modal="sourceOverlayClosing ? undefined : 'true'"
                :aria-label="tr.addingMoreFiles"
                :class="cn(
                    'upup-absolute upup-inset-0 upup-z-20 upup-flex upup-flex-col upup-overflow-hidden upup-rounded-lg upup-ring-1 upup-ring-inset',
                    sourceOverlayClosing
                        ? 'upup-fx-overlay-close-slide upup-pointer-events-none'
                        : 'upup-fx-overlay-slide',
                    dark
                        ? 'upup-bg-[#0b1220]/95 upup-ring-white/[0.06]'
                        : 'upup-bg-white/95 upup-ring-black/[0.06]',
                )"
            >
                <SourceView v-if="activeSource" />
                <SourceSelector v-else />
            </div>
        </template>

        <FileList />
    </div>
</template>
