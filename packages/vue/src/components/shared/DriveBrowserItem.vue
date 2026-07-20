<script setup lang="ts">
import { computed } from 'vue'
import { type DriveFile } from '@upupjs/core'
import { useUploaderTheme } from '../../context/uploader-context'
import { cn } from '@upupjs/core/internal'
import DriveBrowserIcon from './DriveBrowserIcon.vue'

const props = defineProps<{
    file: DriveFile
    handleClick: (file: DriveFile) => void | Promise<void>
    selectedFiles: DriveFile[]
}>()

const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

const isFolder = computed(() => props.file.isFolder)
const isFileSelected = computed(
    () => props.selectedFiles.filter(f => f.id === props.file.id).length,
)
</script>

<template>
    <div
        data-upup-slot="drive-browser-item"
        :class="cn(
            'upup-fx-hover-lift upup-group upup-mb-1.5 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-[11px] upup-px-3 upup-py-2.5 upup-ring-1',
            {
                'upup-font-medium': isFolder,
            },
            isFileSelected
                ? dark
                    ? 'upup-bg-[#0ea5e9]/10 upup-ring-[#38bdf8]/35'
                    : 'upup-bg-[#0ea5e9]/10 upup-ring-[#0ea5e9]/40'
                : dark
                  ? 'upup-bg-white/[0.04] upup-ring-white/[0.06] hover:upup-bg-white/[0.07]'
                  : 'upup-bg-black/[0.03] upup-ring-black/[0.06] hover:upup-bg-black/[0.05]',
            {
                [slotClasses.driveItemContainerDefault!]:
                    !isFileSelected &&
                    slotClasses.driveItemContainerDefault,
                [slotClasses.driveItemContainerSelected!]:
                    isFileSelected &&
                    slotClasses.driveItemContainerSelected,
            },
        )"
        @click="props.handleClick(props.file)"
    >
        <div
            :class="cn(
                'upup-flex upup-items-center upup-gap-2',
                slotClasses.driveItemContainerInner,
            )"
        >
            <DriveBrowserIcon :file="props.file" />
            <h1
                :class="cn(
                    'upup-text-wrap upup-break-all upup-text-xs',
                    {
                        'upup-text-[#e0e0e0] dark:upup-text-[#e0e0e0]': dark,
                    },
                    slotClasses.driveItemInnerText,
                )"
            >
                {{ props.file.name }}
            </h1>
        </div>
    </div>
</template>
