<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { formatUiMessage as t, pluralUiMessage as plural, UploadStatus, isUploadActive, cn, type UploadFile } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderSource,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
} from '../context/root-context'
import { PlayerPauseFilledIcon, PlayerPlayFilledIcon, XIcon } from './Icons'
import FileItem from './FileItem.vue'
import MainBoxHeader from './shared/MainBoxHeader.vue'
import ProgressBar from './shared/ProgressBar.vue'
import ShouldRender from './shared/ShouldRender.vue'

const VIRTUAL_SCROLL_THRESHOLD = 20
const ESTIMATED_ITEM_HEIGHT = 76

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatEta(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}m ${s}s left`
    return `${s}s left`
}

const viewCtx = useUploaderView()
const sourceCtx = useUploaderSource()
const filesCtx = useUploaderFiles()
const { translations: tr } = useUploaderI18n()
const uploadControlsCtx = useUploaderUploadControls()
const { isProcessing, resumable } = useUploaderOptions()
const { isDark: dark, slotOverrides: slotClasses, slots: themeSlots } = useUploaderTheme()

const scrollRef = ref<HTMLDivElement | null>(null)

function getSortedFiles() {
    const files = filesCtx.files
    const entries = Array.from(files.entries())
    return entries.map(([, file]) => file).sort((a, b) => {
        const pa = a.relativePath || a.name
        const pb = b.relativePath || b.name
        return pa.localeCompare(pb) || a.name.localeCompare(b.name)
    })
}

function getFileAt(index: number): UploadFile {
    const file = getSortedFiles()[index]
    if (!file) {
        throw new Error(`Missing file at index ${index}`)
    }
    return file
}

function fileKey(file: UploadFile): string {
    return [
        file.id,
        file.relativePath,
        file.name,
        file.size,
        file.type,
    ].filter(Boolean).join(':')
}

const shouldVirtualize = computed(
    () => filesCtx.files.size >= VIRTUAL_SCROLL_THRESHOLD && viewCtx.viewMode !== 'grid',
)

const virtualizer = useVirtualizer(
    computed(() => ({
        count: filesCtx.files.size,
        getScrollElement: () => scrollRef.value,
        estimateSize: () => ESTIMATED_ITEM_HEIGHT,
        overscan: 5,
        enabled: shouldVirtualize.value,
    })),
)

const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

function onUploadClick() {
    void uploadControlsCtx.upload.proceedUpload().catch(() => undefined)
}

function onRetryClick() {
    void uploadControlsCtx.upload.retryUpload().catch(() => undefined)
}
</script>

<template>
    <div
        data-testid="upup-file-list"
        data-upup-slot="file-list"
        :class="cn(
            'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
            { 'upup-hidden': viewCtx.isAddingMore || sourceCtx.activeAdapter || !filesCtx.files.size },
            themeSlots?.fileList?.root,
        )"
    >
        <MainBoxHeader :handle-cancel="uploadControlsCtx.handleCancel" />

        <div
            ref="scrollRef"
            :class="cn(
                'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-bg-black/[0.075] upup-p-3',
                { 'upup-bg-white/10 dark:upup-bg-white/10': dark },
                slotClasses.fileListContainer,
            )"
        >
            <!-- Virtualized list -->
            <div
                v-if="shouldVirtualize"
                data-upup-slot="file-list-virtual"
                :style="{ height: totalSize + 'px', position: 'relative' }"
                :class="cn(
                    isProcessing && 'upup-pointer-events-none upup-opacity-75',
                    'upup-font-[Arial,Helvetica,sans-serif]',
                )"
            >
                <div
                    v-for="virtualItem in virtualItems"
                    :key="String(virtualItem.key)"
                    :data-index="virtualItem.index"
                    :style="{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                        paddingBottom: '12px',
                    }"
                >
                    <FileItem :file="getFileAt(virtualItem.index)" />
                </div>
            </div>

            <!-- Standard rendering -->
            <div
                v-else
                :class="cn(
                    `${isProcessing ? 'upup-pointer-events-none upup-opacity-75' : ''} upup-flex upup-flex-col upup-gap-3 upup-font-[Arial,Helvetica,sans-serif]`,
                    {
                        'md:upup-grid md:upup-gap-y-6': filesCtx.files.size > 1 && viewCtx.viewMode === 'grid',
                        'md:upup-grid-cols-2': filesCtx.files.size > 1 && viewCtx.viewMode === 'grid',
                        'upup-flex-1': filesCtx.files.size === 1,
                        [slotClasses.fileListContainerInnerMultiple!]:
                            slotClasses.fileListContainerInnerMultiple && filesCtx.files.size > 1,
                        [slotClasses.fileListContainerInnerSingle!]:
                            slotClasses.fileListContainerInnerSingle && filesCtx.files.size === 1,
                    },
                )"
            >
                <FileItem
                    v-for="file in getSortedFiles()"
                    :key="fileKey(file)"
                    :file="file"
                />
            </div>
        </div>

        <div
            :class="cn(
                'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
                slotClasses.fileListFooter,
            )"
        >
            <ShouldRender
                :if="uploadControlsCtx.upload.uploadStatus !== UploadStatus.SUCCESSFUL && uploadControlsCtx.upload.uploadStatus !== UploadStatus.FAILED"
            >
                <button
                    data-testid="upup-upload-btn"
                    :class="cn(
                        'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': dark },
                        slotClasses.uploadButton,
                    )"
                    @click="onUploadClick"
                    :disabled="isUploadActive(uploadControlsCtx.upload.uploadStatus) || uploadControlsCtx.upload.uploadStatus === UploadStatus.PAUSED || isProcessing"
                >
                    {{ t(plural(tr, 'uploadFiles', filesCtx.files.size), { count: filesCtx.files.size }) }}
                </button>
            </ShouldRender>
            <ShouldRender :if="uploadControlsCtx.upload.uploadStatus === UploadStatus.FAILED">
                <button
                    data-testid="upup-retry-btn"
                    :class="cn(
                        'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-red-500 dark:upup-bg-red-500': dark },
                        slotClasses.uploadButton,
                    )"
                    @click="onRetryClick"
                >
                    {{ resumable?.protocol === 'multipart' ? tr.resumeUpload : tr.retryUpload }}
                </button>
            </ShouldRender>
            <ShouldRender :if="uploadControlsCtx.upload.uploadStatus === UploadStatus.SUCCESSFUL">
                <button
                    :class="cn(
                        'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': dark },
                        slotClasses.uploadDoneButton,
                    )"
                    @click="uploadControlsCtx.handleDone"
                >
                    {{ tr.done }}
                </button>
            </ShouldRender>
            <div class="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                <div class="upup-flex upup-items-center upup-gap-2">
                    <ShouldRender
                        :if="
                            resumable?.protocol === 'multipart' &&
                            (isUploadActive(uploadControlsCtx.upload.uploadStatus) || uploadControlsCtx.upload.uploadStatus === UploadStatus.PAUSED)
                        "
                    >
                        <button
                            data-testid="upup-upload-pause-toggle"
                            :class="cn(
                                'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-gray-200 upup-text-gray-700 upup-transition-colors hover:upup-bg-gray-300',
                                { 'upup-bg-white/10 upup-text-white hover:upup-bg-white/20': dark },
                            )"
                            @click="uploadControlsCtx.upload.uploadStatus === UploadStatus.PAUSED ? uploadControlsCtx.handleResume() : uploadControlsCtx.handlePause()"
                            :aria-label="uploadControlsCtx.upload.uploadStatus === UploadStatus.PAUSED ? tr.resumeUpload : tr.pauseUpload"
                            :title="uploadControlsCtx.upload.uploadStatus === UploadStatus.PAUSED ? tr.resumeUpload : tr.pauseUpload"
                        >
                            <PlayerPlayFilledIcon v-if="uploadControlsCtx.upload.uploadStatus === UploadStatus.PAUSED" :size="14" />
                            <PlayerPauseFilledIcon v-else :size="14" />
                        </button>
                        <button
                            data-testid="upup-upload-cancel-btn"
                            :class="cn(
                                'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-red-100 upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
                                { 'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30': dark },
                            )"
                            @click="uploadControlsCtx.handleCancel"
                            :aria-label="tr.cancel"
                            :title="tr.cancel"
                        >
                            <XIcon :size="14" />
                        </button>
                    </ShouldRender>
                    <ProgressBar
                        class="upup-flex-1"
                        progress-bar-class-name="upup-rounded"
                        :progress="uploadControlsCtx.upload.totalProgress"
                        :show-value="true"
                    />
                </div>
                <ShouldRender
                    :if="(isUploadActive(uploadControlsCtx.upload.uploadStatus) || uploadControlsCtx.upload.uploadStatus === UploadStatus.PAUSED) && uploadControlsCtx.upload.totalBytes > 0"
                >
                    <div
                        :class="cn(
                            'upup-flex upup-items-center upup-justify-between upup-text-[11px] upup-text-gray-500',
                            { 'upup-text-gray-400': dark },
                        )"
                    >
                        <span>
                            {{ formatBytes(uploadControlsCtx.upload.uploadedBytes) }} of {{ formatBytes(uploadControlsCtx.upload.totalBytes) }}
                            <template v-if="uploadControlsCtx.upload.uploadSpeed > 0">
                                &middot; {{ formatBytes(uploadControlsCtx.upload.uploadSpeed) }}/s
                            </template>
                        </span>
                        <ShouldRender :if="isUploadActive(uploadControlsCtx.upload.uploadStatus) && uploadControlsCtx.upload.uploadEta > 0">
                            <span>{{ formatEta(uploadControlsCtx.upload.uploadEta) }}</span>
                        </ShouldRender>
                        <ShouldRender :if="uploadControlsCtx.upload.uploadStatus === UploadStatus.PAUSED">
                            <span>{{ tr.paused }}</span>
                        </ShouldRender>
                    </div>
                </ShouldRender>
            </div>
        </div>
    </div>
</template>
