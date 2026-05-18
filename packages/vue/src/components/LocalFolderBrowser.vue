<script setup lang="ts">
import { ref } from 'vue'
import {
    useUploaderFiles,
    useUploaderSource,
    useUploaderTheme,
} from '../context/root-context'
import { cn } from '@upup/core'
import AdapterViewContainer from './shared/AdapterViewContainer.vue'

const { setFiles } = useUploaderFiles()
const { setActiveAdapter } = useUploaderSource()
const { isDark: dark } = useUploaderTheme()

const error = ref<string | null>(null)
const loading = ref(false)

async function openFolderPicker() {
    if (!('showDirectoryPicker' in window)) {
        error.value = 'Your browser does not support folder selection.'
        return
    }

    try {
        loading.value = true
        error.value = null
        // @ts-expect-error showDirectoryPicker is not in all TS lib defs
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
        const files = await collectFiles(dirHandle)
        if (files.length > 0) {
            setFiles(files)
            setActiveAdapter(undefined)
        }
    } catch (err) {
        const msg = (err as Error)?.message ?? ''
        // User cancelled — no error message needed
        if (!msg.includes('AbortError') && !(err instanceof DOMException && err.name === 'AbortError')) {
            error.value = 'Failed to read folder. Please try again.'
        }
    } finally {
        loading.value = false
    }
}

async function collectFiles(dirHandle: FileSystemDirectoryHandle): Promise<File[]> {
    const files: File[] = []
    // @ts-expect-error async iterator on FileSystemDirectoryHandle
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            const file = await (entry as FileSystemFileHandle).getFile()
            files.push(file)
        } else if (entry.kind === 'directory') {
            const nested = await collectFiles(entry as FileSystemDirectoryHandle)
            files.push(...nested)
        }
    }
    return files
}
</script>

<template>
    <AdapterViewContainer data-testid="upup-local-folder-browser" data-upup-slot="local-folder-browser">
        <div class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-6">
            <div
                :class="cn(
                    'upup-flex upup-h-20 upup-w-20 upup-items-center upup-justify-center upup-rounded-full upup-bg-blue-500/20',
                )"
            >
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
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
            </div>

            <p
                v-if="error"
                :class="cn('upup-text-sm upup-text-red-500', {
                    'upup-text-red-400': dark,
                })"
            >
                {{ error }}
            </p>

            <button
                type="button"
                :disabled="loading"
                :class="cn(
                    'upup-rounded-lg upup-bg-blue-600 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700 disabled:upup-opacity-50',
                    {
                        'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]': dark,
                    },
                )"
                @click="openFolderPicker"
            >
                {{ loading ? 'Loading…' : 'Choose Folder' }}
            </button>
        </div>
    </AdapterViewContainer>
</template>
