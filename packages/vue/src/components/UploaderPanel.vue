<script setup lang="ts">
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
    useUploaderView,
} from '../context/root-context'
import useUploaderPanel from '../composables/useUploaderPanel'
import { cn } from '@upup/core'
import SourceSelector from './SourceSelector.vue'
import SourceView from './SourceView.vue'
import FileList from './FileList.vue'
import ShouldRender from './shared/ShouldRender.vue'

const { files } = useUploaderFiles()
const { activeAdapter } = useUploaderSource()
const { isAddingMore } = useUploaderView()
const { isOnline, inputRef, openFilePicker } = useUploaderRuntime()
const { translations: tr } = useUploaderI18n()
const { isDark: dark } = useUploaderTheme()
const {
    isDragging,
    absoluteIsDragging,
    absoluteHasBorder,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
} = useUploaderPanel()

function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (inputRef.value) {
            inputRef.value.removeAttribute('webkitdirectory')
            inputRef.value.removeAttribute('directory')
        }
        openFilePicker()
    }
}
</script>

<template>
    <div
        data-testid="upup-dropzone"
        data-upup-slot="main-box"
        role="button"
        :tabindex="0"
        :aria-label="tr.dropzoneLabel"
        :aria-dropeffect="isDragging ? 'copy' : 'none'"
        @keydown="onKeyDown"
        :class="cn(
            'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg',
            {
                'upup-border upup-border-[#1849D6]': absoluteHasBorder,
                'upup-border-[#30C5F7] dark:upup-border-[#30C5F7]': absoluteHasBorder && dark,
                'upup-border-dashed': !isDragging,
                'upup-bg-[#E7ECFC] upup-backdrop-blur-sm': absoluteIsDragging && !dark,
                'upup-bg-[#045671] upup-backdrop-blur-sm dark:upup-bg-[#045671]': absoluteIsDragging && dark,
            },
        )"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @paste="handlePaste"
    >
        <ShouldRender :if="!isOnline">
            <div
                :class="cn(
                    'upup-absolute upup-inset-x-0 upup-top-0 upup-z-20 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
                    { 'upup-bg-yellow-600': dark },
                )"
            >
                No internet connection — uploads will resume when you reconnect.
            </div>
        </ShouldRender>
        <ShouldRender :if="!!activeAdapter">
            <SourceView />
        </ShouldRender>
        <ShouldRender :if="!activeAdapter && (isAddingMore || !files.size)">
            <SourceSelector />
        </ShouldRender>
        <FileList />
    </div>
</template>
