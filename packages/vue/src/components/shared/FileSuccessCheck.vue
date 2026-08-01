<script setup lang="ts">
import { computed } from 'vue'

/**
 * Completion checkmark (states-tour.html state E): a sky ring with a tick that
 * DRAWS in and a wrapper that POPS, shown when a file reaches
 * UploadStatus.SUCCESSFUL. Hosts (FilePreview tile, FileRow, FileHero) gate it
 * on status; the fx classes render UNCONDITIONALLY — the shared CSS
 * `data-motion="off"` kill rule is the one gate, so under motion-off the mark
 * simply appears drawn (no draw/pop). aria-hidden: completion is already
 * conveyed textually by the file list's live region + the upload announcement.
 */
const props = withDefaults(
    defineProps<{
        /** Position in the sorted list — drives the draw/pop stagger (capped at 8). */
        index?: number
        size?: number
    }>(),
    { index: 0, size: 22 },
)

const delay = computed(() => `${Math.min(props.index, 8) * 40}ms`)
</script>

<template>
    <span
        data-upup-slot="file-success"
        aria-hidden="true"
        class="upup-animate-fx-pop upup-inline-flex"
        :style="{ animationDelay: delay }"
    >
        <svg
            viewBox="0 0 24 24"
            :width="size"
            :height="size"
            fill="none"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="11" stroke="#38bdf8" stroke-width="2" />
            <path
                d="M7 12.5l3.2 3.2L17 8.8"
                stroke="#38bdf8"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                pathLength="24"
                stroke-dasharray="24"
                class="upup-animate-fx-draw"
                :style="{ animationDelay: delay }"
            />
        </svg>
    </span>
</template>
