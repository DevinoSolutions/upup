<script setup lang="ts">
import { ref } from 'vue'
import type { UploadFile } from '@useupup/core'
import {
    useUploaderFiles,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderTheme,
} from '../context/uploader-context'
import { cn } from '@useupup/core/internal'
import FilePreview from './FilePreview.vue'
import FilePreviewPortal from './FilePreviewPortal.vue'

const props = defineProps<{
    file: UploadFile
}>()

const { core } = useUploaderRuntime()
const { files } = useUploaderFiles()
const { onFileClick } = useUploaderOptions()
const { slotOverrides: slotClasses } = useUploaderTheme()

const showPreviewPortal = ref(false)
const canPreview = ref(false)

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
        :class="cn(
            'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
            {
                [slotClasses.fileItemMultiple!]: slotClasses.fileItemMultiple && files.size > 1,
                [slotClasses.fileItemSingle!]: slotClasses.fileItemSingle && files.size === 1,
            },
        )"
    >
        <FilePreview
            :file-name="file.name"
            :file-type="file.type ?? ''"
            :file-id="file.id"
            :file-url="file.url ?? ''"
            :file-size="file.size"
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
    </div>
</template>
