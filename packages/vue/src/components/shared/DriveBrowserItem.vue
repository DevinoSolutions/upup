<script setup lang="ts">
import { type DriveFile } from '@useupup/core'
import { useUploaderTheme } from '../../context/uploader-context'
import { cn } from '@useupup/core/internal'
import DriveBrowserIcon from './DriveBrowserIcon.vue'

const props = defineProps<{
    file: DriveFile
    handleClick: (file: DriveFile) => void | Promise<void>
    selectedFiles: DriveFile[]
}>()

const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

const isFolder = props.file.isFolder
const isFileSelected = props.selectedFiles.filter(f => f.id === props.file.id).length
</script>

<template>
    <div
        data-upup-slot="drive-browser-item"
        :class="cn(
            'upup-hover:bg-[#bab4b499] upup-group upup-mb-1 upup-flex upup-cursor-pointer upup-items-center upup-justify-between upup-gap-2 upup-rounded-md upup-p-1 upup-py-2 upup-transition-colors upup-duration-150',
            {
                'upup-font-medium': isFolder,
                'upup-bg-[#bab4b499]': isFileSelected,
                'upup-bg-[#e9ecef00]': !isFileSelected,
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
