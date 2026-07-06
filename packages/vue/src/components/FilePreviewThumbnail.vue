<script setup lang="ts">
import { computed } from 'vue'
import type { Translations } from '@upup/core'
import type { InternalFlatClassNames } from '@upup/core/internal'
import { fileGetExtension, fileGetIsPdf, fileGetIsText, fileIs3D } from '@upup/core/internal'
import { cn } from '@upup/core/internal'
import FileIcon from './FileIcon.vue'

const props = defineProps<{
    canPreview: boolean
    fileType: string
    fileName: string
    fileUrl: string
    fileSize?: number | undefined
    slotClasses: InternalFlatClassNames
    allowPreview: boolean
    labels: Translations
}>()

const emit = defineEmits<{
    'update:canPreview': [value: boolean]
}>()

const extension = computed(() => fileGetExtension(props.fileType, props.fileName))
const is3D = computed(() => fileIs3D(extension.value?.toLowerCase() || ''))
const isPdf = computed(() => fileGetIsPdf(props.fileType, props.fileName))
// Text files render as a static doc icon (cross-framework parity).
const isText = computed(() => fileGetIsText(props.fileType, props.fileName))

function onObjectLoad() {
    emit('update:canPreview', true)
}
</script>

<template>
    <!-- PDFs, 3D files, and oversized text -> static icon -->
    <div
        v-if="isPdf || is3D || isText"
        class="upup-flex upup-flex-col upup-items-center upup-gap-2"
    >
        <FileIcon :extension="extension" :class="slotClasses.fileIcon" />
    </div>
    <template v-else>
        <template v-if="!canPreview">
            <object
                :data="fileUrl"
                width="0%"
                height="0%"
                :name="fileName"
                :type="fileType"
                @load="onObjectLoad"
            >
                <p>{{ labels.loading }}</p>
            </object>
            <FileIcon :extension="extension" />
        </template>

        <template v-if="canPreview">
            <FileIcon
                :extension="extension"
                :class="cn(
                    { 'md:upup-hidden': allowPreview },
                    slotClasses.fileIcon,
                )"
            />
            <div
                :class="cn(
                    `upup-relative upup-hidden upup-h-full upup-w-full ${allowPreview ? 'md:upup-block' : ''}`,
                )"
            >
                <object
                    :data="fileUrl"
                    width="100%"
                    height="100%"
                    :name="fileName"
                    :type="fileType"
                    class="upup-absolute upup-h-full upup-w-full"
                >
                    <p>{{ labels.loading }}</p>
                </object>
            </div>
        </template>
    </template>
</template>
