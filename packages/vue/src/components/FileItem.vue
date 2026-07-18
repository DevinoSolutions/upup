<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UploadFile } from '@upupjs/core'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderTheme,
    useUploaderView,
} from '../context/uploader-context'
import { cn } from '@upupjs/core/internal'
import FilePreview from './FilePreview.vue'
import FilePreviewPortal from './FilePreviewPortal.vue'
import FileRow from './FileRow.vue'

const props = withDefaults(
    defineProps<{
        file: UploadFile
        /** Position in the sorted list — drives the entrance stagger. */
        index?: number
    }>(),
    { index: 0 },
)

const { core } = useUploaderRuntime()
const { files, leavingFileIds } = useUploaderFiles()
const { viewMode } = useUploaderView()
const { onFileClick } = useUploaderOptions()
const { slotOverrides: slotClasses } = useUploaderTheme()

const showPreviewPortal = ref(false)
const canPreview = ref(false)

const leaving = computed(() => leavingFileIds.value.has(props.file.id))

function openPreviewPortal() {
    showPreviewPortal.value = true
    core?.emit('file-preview-open', { fileId: props.file.id, fileName: props.file.name })
}

function closePreviewPortal() {
    showPreviewPortal.value = false
    core?.emit('file-preview-close', { fileId: props.file.id, fileName: props.file.name })
}

function onStopPropagation(e: MouseEvent) {
    e.stopPropagation()
}
</script>

<template>
    <div
        data-testid="upup-file-item"
        data-upup-slot="file-item"
        role="listitem"
        :class="cn(
            'upup-animate-fx-enter',
            'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
            leaving && 'upup-animate-fx-exit upup-overflow-hidden',
            {
                [slotClasses.fileItemMultiple!]: slotClasses.fileItemMultiple && files.size > 1,
                [slotClasses.fileItemSingle!]: slotClasses.fileItemSingle && files.size === 1,
            },
        )"
        :style="leaving ? undefined : { animationDelay: `${Math.min(index ?? 0, 8) * 40}ms` }"
    >
        <FileRow v-if="viewMode === 'list'" :file="file" :index="index ?? 0" />
        <template v-else>
            <FilePreview
                :file-name="file.name"
                :file-type="file.type ?? ''"
                :file-id="file.id"
                :file-url="file.url ?? ''"
                :file-size="file.size"
                :index="index ?? 0"
                :can-preview="canPreview"
                :on-request-preview="openPreviewPortal"
                @update:can-preview="canPreview = $event"
                @click="onFileClick(file)"
            />
            <FilePreviewPortal
                v-if="canPreview && showPreviewPortal"
                :file-type="file.type ?? ''"
                :file-url="file.url ?? ''"
                :file-name="file.name"
                :file-size="file.size"
                @close="closePreviewPortal"
                @stop-propagation="onStopPropagation"
            />
        </template>
    </div>
</template>
