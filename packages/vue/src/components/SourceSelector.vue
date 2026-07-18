<script setup lang="ts">
import { computed } from 'vue'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderTheme,
    useUploaderView,
} from '../context/uploader-context'
import useSourceSelector from '../composables/useSourceSelector'
import Icon from './Icon'

const { core, inputRef, openFilePicker } = useUploaderRuntime()
const { translations: tr } = useUploaderI18n()
const { sourceOverlayOpen, closeSourceOverlay } = useUploaderView()
const { setFiles } = useUploaderFiles()
const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
const {
    mini,
    allowedFileTypes,
    multiple,
    limit,
    maxFileSize,
    folderPickerButtonVisible,
} = useUploaderOptions()

// Idle limits caption (data-upup-slot="limits-caption"): iconified file-count
// and per-file size limits, plus a leading text-only type-restriction segment
// so no constraint the consumer configured is dropped.
const typeConstraint = computed(() => {
    if (
        allowedFileTypes &&
        allowedFileTypes !== '*/*' &&
        allowedFileTypes !== '*'
    ) {
        const humanized = allowedFileTypes
            .split(',')
            .map((s) => s.trim())
            .map((m) => {
                if (m.startsWith('.')) return m
                const [type, sub] = m.split('/')
                if (!type || !sub) return m
                if (sub === '*')
                    return type.charAt(0).toUpperCase() + type.slice(1) + 's'
                return sub.toUpperCase()
            })
            .join(', ')
        return humanized + ' only'
    }
    return null
})
const showFilesLimit = computed(() => limit > 1)
const showSizeLimit = computed(() => !!(maxFileSize?.size && maxFileSize?.unit))
const hasLimitsCaption = computed(
    () => !!typeConstraint.value || showFilesLimit.value || showSizeLimit.value,
)

const { chosenSources, handleSourceClick, handleInputFileChange } =
    useSourceSelector()

function handleBrowseFilesClick() {
    if (inputRef.value) {
        inputRef.value.removeAttribute('webkitdirectory')
        inputRef.value.removeAttribute('directory')
    }
    openFilePicker()
    core?.emit('browse-files', {})
}

async function handleSelectFolderClick() {
    const fsWindow = window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }
    if (fsWindow.showDirectoryPicker) {
        try {
            const directoryHandle = await fsWindow.showDirectoryPicker()
            const collectedFiles: File[] = []

            type IterableDirHandle = { values(): AsyncIterableIterator<FileSystemHandle & { kind: string; getFile: () => Promise<File> }> }
            async function getFiles(dirHandle: IterableDirHandle, path = '') {
                for await (const entry of dirHandle.values()) {
                    const newPath = path ? `${path}/${entry.name}` : entry.name
                    if (entry.kind === 'file') {
                        const pickedFile = await entry.getFile()
                        const file = new File(
                            [await pickedFile.arrayBuffer()],
                            pickedFile.name,
                            { type: pickedFile.type, lastModified: pickedFile.lastModified },
                        )
                        try {
                            Object.defineProperty(file, 'webkitRelativePath', {
                                value: newPath, configurable: true, writable: true,
                            })
                            Object.defineProperty(file, 'relativePath', {
                                value: newPath, configurable: true, writable: true,
                            })
                        } catch {
                            Object.assign(file, { relativePath: newPath })
                        }
                        collectedFiles.push(file)
                    } else if (entry.kind === 'directory') {
                        await getFiles(entry as unknown as IterableDirHandle, newPath)
                    }
                }
            }
            await getFiles(directoryHandle as unknown as IterableDirHandle)
            if (collectedFiles.length > 0) {
                setFiles(collectedFiles)
                core?.emit('folder-select', { count: collectedFiles.length })
                if (inputRef.value) inputRef.value.value = ''
            }
        } catch (error) {
            const name = error instanceof DOMException ? error.name : ''
            if (name !== 'AbortError') throw error
        }
    } else {
        if (inputRef.value) {
            inputRef.value.setAttribute('webkitdirectory', 'true')
            inputRef.value.setAttribute('directory', 'true')
        }
        openFilePicker()
        core?.emit('folder-select', { count: 0 })
    }
}
</script>

<template>
    <div
        data-testid="upup-source-selector"
        data-upup-slot="source-selector"
        :class="cn(
            'upup-animate-fx-view upup-relative upup-flex upup-h-full upup-flex-col upup-gap-6 upup-rounded-lg',
            {
                'upup-items-center upup-justify-center upup-px-4 upup-py-6': !sourceOverlayOpen,
            },
        )"
    >
        <template v-if="sourceOverlayOpen">
            <div
                :class="cn(
                    'upup-shadow-bottom upup-flex upup-w-full upup-items-center upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                    { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
                    slotClasses.containerHeader,
                )"
            >
                <button
                    :class="cn(
                        'upup-flex upup-items-center upup-gap-1 upup-text-sm upup-font-medium upup-text-[#0284c7]',
                        { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': dark },
                        slotClasses.containerCancelButton,
                    )"
                    @click="closeSourceOverlay"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    {{ tr.overlayBack }}
                </button>
                <span
                    :class="cn(
                        'upup-flex-1 upup-text-center upup-text-sm upup-text-[#6D6D6D]',
                        { 'upup-text-gray-300 dark:upup-text-gray-300': dark },
                    )"
                >
                    {{ tr.addingMoreFiles }}
                </span>
            </div>
        </template>

        <template v-if="!mini">
            <div
                :class="cn(
                    'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-1.5 upup-gap-y-1 upup-px-2 upup-text-center upup-text-base upup-font-medium md:upup-text-lg',
                    {
                        'upup-text-[#242634]': !dark,
                        'upup-text-[#e2e8f0] dark:upup-text-[#e2e8f0]': dark,
                    },
                )"
            >
                <span>{{ tr.dropFilesHere }}</span>
                <button
                    type="button"
                    data-testid="upup-browse-files"
                    :class="cn(
                        'upup-cursor-pointer upup-rounded upup-font-semibold focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
                        {
                            'upup-text-[#0284c7]': !dark,
                            'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': dark,
                        },
                    )"
                    @click="handleBrowseFilesClick"
                >
                    {{ tr.browseFiles }}
                </button>
                <template v-if="folderPickerButtonVisible">
                    <span>{{ tr.or }}</span>
                    <button
                        type="button"
                        :class="cn(
                            'upup-cursor-pointer upup-rounded upup-font-semibold focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
                            {
                                'upup-text-[#0284c7]': !dark,
                                'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': dark,
                            },
                        )"
                        @click="handleSelectFolderClick"
                    >
                        {{ tr.selectAFolder }}
                    </button>
                </template>
                <span>{{ tr.orImportFrom }}</span>
            </div>
            <div
                :class="cn(
                    'upup-flex upup-max-w-[420px] upup-flex-wrap upup-items-start upup-justify-center upup-gap-x-6 upup-gap-y-5',
                    slotClasses.sourceButtonList,
                )"
            >
                <button
                    v-for="{ Icon: SourceIcon, id, name } in chosenSources"
                    :key="id"
                    type="button"
                    :data-testid="`upup-source-${id}`"
                    :class="cn(
                        'upup-fx-hover-lift upup-fx-press upup-fx-icon-nudge upup-group upup-flex upup-w-[66px] upup-cursor-pointer upup-flex-col upup-items-center upup-gap-[9px] upup-rounded-[14px] focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
                        slotClasses.sourceButton,
                    )"
                    @click="handleSourceClick(id)"
                >
                    <span
                        :class="cn(
                            'upup-flex upup-h-[52px] upup-w-[52px] upup-items-center upup-justify-center upup-rounded-[14px] upup-ring-1 upup-transition-colors',
                            {
                                'upup-bg-white upup-shadow-[0_1px_3px_rgba(15,23,42,0.1)] upup-ring-black/[0.07] group-hover:upup-bg-slate-50': !dark,
                                'upup-bg-white/[0.055] upup-ring-white/[0.06] group-hover:upup-bg-white/[0.09] dark:upup-bg-white/[0.055] dark:upup-ring-white/[0.06]': dark,
                            },
                        )"
                    >
                        <component
                            :is="SourceIcon"
                            :class="cn('upup-h-8 upup-w-8', slotClasses.sourceButtonIcon)"
                        />
                    </span>
                    <span
                        :class="cn(
                            'upup-text-xs upup-leading-none',
                            {
                                'upup-text-[#6D6D6D]': !dark,
                                'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]': dark,
                            },
                            slotClasses.sourceButtonText,
                        )"
                    >
                        {{ name }}
                    </span>
                </button>
            </div>
        </template>

        <input
            type="file"
            name="upup-files"
            :accept="allowedFileTypes"
            class="upup-hidden"
            data-testid="upup-file-input"
            aria-hidden="true"
            :tabindex="-1"
            :ref="(el) => { if (inputRef) { /* inputRef handled by parent */ } }"
            :multiple="multiple"
            @change="handleInputFileChange"
        />

        <template v-if="mini">
            <button
                type="button"
                @click="handleBrowseFilesClick"
                class="upup-flex upup-cursor-pointer upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-p-2"
            >
                <Icon
                    name="upload"
                    :size="32"
                    :class="cn(
                        'upup-h-16 upup-w-16 md:upup-h-20 md:upup-w-20',
                        {
                            'upup-text-[#0B0B0B]': !dark,
                            'upup-text-white dark:upup-text-white': dark,
                        },
                    )"
                />
                <p
                    :class="cn('px-6 upup-text-center upup-text-xs', {
                        'upup-text-[#6D6D6D] dark:upup-text-gray-400': !dark,
                        'upup-text-gray-400 dark:upup-text-gray-500': dark,
                    })"
                >
                    Drag or browse to upload
                </p>
            </button>
        </template>
        <template v-else>
            <template v-if="hasLimitsCaption">
                <div
                    data-upup-slot="limits-caption"
                    :class="cn(
                        'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-2.5 upup-gap-y-1 upup-px-3 upup-text-center upup-text-xs',
                        {
                            'upup-text-[#6D6D6D]': !dark,
                            'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]': dark,
                        },
                    )"
                >
                    <span v-if="typeConstraint">{{ typeConstraint }}</span>
                    <span
                        v-if="typeConstraint && (showFilesLimit || showSizeLimit)"
                        aria-hidden="true"
                        >&middot;</span
                    >
                    <span
                        v-if="showFilesLimit"
                        class="upup-inline-flex upup-items-center upup-gap-1.5"
                    >
                        <span aria-hidden="true" class="upup-inline-flex">
                            <Icon name="stacked-files" class="upup-h-4 upup-w-4" />
                        </span>
                        {{ t(plural(tr, 'filesMax', limit), { count: limit }) }}
                    </span>
                    <span
                        v-if="showFilesLimit && showSizeLimit"
                        aria-hidden="true"
                        >&middot;</span
                    >
                    <span
                        v-if="showSizeLimit"
                        class="upup-inline-flex upup-items-center upup-gap-1.5"
                    >
                        <span aria-hidden="true" class="upup-inline-flex">
                            <Icon name="storage" class="upup-h-4 upup-w-4" />
                        </span>
                        {{ t(tr.sizeEach, { size: maxFileSize?.size ?? 0, unit: maxFileSize?.unit ?? '' }) }}
                    </span>
                </div>
            </template>
        </template>
    </div>
</template>
