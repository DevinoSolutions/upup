<script setup lang="ts">
import { ref, computed } from 'vue'
import {
    type DriveBrowserError,
    type DriveFile,
    type DriveFolder,
    type DriveUser,
    formatUiMessage as t,
    pluralUiMessage as plural,
} from '@upup/core'
import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
} from '../../context/uploader-context'
import { searchDriveFiles } from '@upup/core/internal'
import { cn } from '@upup/core/internal'
import SourceViewContainer from './SourceViewContainer.vue'
import DriveBrowserHeader from './DriveBrowserHeader.vue'
import DriveBrowserItem from './DriveBrowserItem.vue'

const props = withDefaults(defineProps<{
    isClickLoading?: boolean
    driveFiles?: DriveFolder
    path: DriveFolder[]
    setPath: (newPath: DriveFolder[]) => void
    user?: DriveUser
    handleSignOut: () => Promise<void>
    handleClick: (file: DriveFile) => void | Promise<void>
    selectedFiles: DriveFile[]
    showLoader: boolean
    handleSubmit: () => Promise<void>
    handleCancelDownload: () => void
    onSelectCurrentFolder?: () => Promise<void> | void
    error?: DriveBrowserError
    hasMore?: boolean
    isLoadingMore?: boolean
    loadMore?: () => void | Promise<void>
    dataUpupSlot?: string
}>(), {
    isClickLoading: false,
    hasMore: false,
    isLoadingMore: false,
    dataUpupSlot: 'drive-browser',
})

const { allowedFileTypes, icons } = useUploaderOptions()
const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
const { translations: tr } = useUploaderI18n()
const searchTerm = ref('')

function filterItems(item: DriveFile, accept: string) {
    if (item.isFolder) return true
    if (!accept || accept === '*') return true
    return accept.split(',').some(pattern => {
        const p = pattern.trim()
        if (p.startsWith('.')) return item.name.endsWith(p)
        if (p.endsWith('/*')) return item.mimeType.startsWith(p.replace('/*', '/'))
        return item.mimeType === p
    })
}

const items = computed(() =>
    props.path[props.path.length - 1]?.children?.filter(
        item => filterItems(item, allowedFileTypes),
    ),
)

const displayedItems = computed(() =>
    searchDriveFiles(items.value, searchTerm.value) || [],
)

// error short-circuits the perpetual loader — the exact F-123/F-124 symptom.
const isLoading = computed(() => !props.error && (props.isClickLoading || !props.driveFiles))

function noopClick() { /* disabled click */ }
</script>

<template>
    <SourceViewContainer :is-loading="isLoading" :data-upup-slot="props.dataUpupSlot">
        <component :is="icons.LoaderIcon" v-if="isLoading" />
        <template v-else>
            <div data-testid="upup-drive-browser" class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto">
                <DriveBrowserHeader
                    :show-search="!!items?.length"
                    :path="props.path"
                    :set-path="props.setPath"
                    :search-term="searchTerm"
                    :on-search="(v: string) => searchTerm = v"
                    :user="props.user"
                    :handle-sign-out="props.handleSignOut"
                />
                <template v-if="!!props.path">
                    <div
                        :class="cn(
                            'upup-h-full upup-overflow-y-scroll upup-bg-black/[0.075] upup-pt-2',
                            {
                                'upup-bg-white/10 upup-text-[#fafafa] dark:upup-bg-white/10 dark:upup-text-[#fafafa]': dark,
                            },
                            slotClasses.driveBody,
                        )"
                    >
                        <template v-if="!!props.error">
                            <p
                                data-testid="upup-drive-error"
                                data-upup-slot="drive-error"
                                role="alert"
                                class="upup-p-4 upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                            >
                                {{ t(tr.driveLoadError, { message: props.error.message }) }}
                            </p>
                        </template>
                        <template v-if="!!displayedItems.length">
                            <ul class="upup-p-2">
                                <DriveBrowserItem
                                    v-for="file in displayedItems"
                                    :key="file.id"
                                    :file="file"
                                    :handle-click="props.isClickLoading || props.showLoader ? noopClick : props.handleClick"
                                    :selected-files="props.selectedFiles"
                                />
                            </ul>
                        </template>
                        <template v-if="!displayedItems.length && !props.error">
                            <div class="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center">
                                <p class="upup-text-xs upup-opacity-70">
                                    {{ tr.noAcceptedFilesFound }}
                                </p>
                            </div>
                        </template>
                        <template v-if="!!props.hasMore">
                            <button
                                data-testid="upup-drive-load-more"
                                data-upup-slot="drive-load-more"
                                class="upup-mx-auto upup-my-2 upup-block upup-rounded-md upup-px-3 upup-py-1.5 upup-text-sm upup-text-blue-600 disabled:upup-opacity-50"
                                :disabled="props.isLoadingMore"
                                @click="props.loadMore?.()"
                            >
                                {{ props.isLoadingMore ? tr.loading : tr.loadMore }}
                            </button>
                        </template>
                    </div>
                </template>

                <template v-if="!!props.selectedFiles.length || !!props.onSelectCurrentFolder">
                    <div
                        :class="cn(
                            'upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-bg-black/[0.025] upup-px-3 upup-py-2',
                            {
                                'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]': dark,
                            },
                            slotClasses.driveFooter,
                        )"
                    >
                        <template v-if="!!props.onSelectCurrentFolder">
                            <button
                                :class="cn(
                                    'upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-blue-600 upup-transition-all upup-duration-300',
                                    {
                                        'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': dark,
                                    },
                                )"
                                :disabled="props.showLoader"
                                @click="props.onSelectCurrentFolder?.()"
                            >
                                {{ tr.selectThisFolder }}
                            </button>
                        </template>
                        <button
                            :class="cn(
                                'upup-rounded-md upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
                                {
                                    'upup-animate-pulse': props.showLoader,
                                    'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': dark,
                                },
                                slotClasses.driveAddFilesButton,
                            )"
                            :disabled="props.showLoader"
                            @click="props.handleSubmit"
                        >
                            {{ t(
                                plural(
                                    tr,
                                    'addFiles',
                                    props.selectedFiles.length,
                                ),
                                { count: props.selectedFiles.length },
                            ) }}
                        </button>
                        <button
                            :class="cn(
                                'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-blue-600 upup-transition-all upup-duration-300',
                                {
                                    'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': dark,
                                },
                                slotClasses.driveCancelFilesButton,
                            )"
                            :disabled="props.showLoader"
                            @click="props.handleCancelDownload"
                        >
                            {{ tr.cancel }}
                        </button>
                    </div>
                </template>
            </div>
        </template>
    </SourceViewContainer>
</template>
