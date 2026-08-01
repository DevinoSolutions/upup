<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import {
    formatUiMessage as t,
    pluralUiMessage as plural,
    UploadStatus,
} from '@upupjs/core'
import { isUploadActive, cn } from '@upupjs/core/internal'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderSource,
    useUploaderTheme,
    useUploaderUploadControls,
    useUploaderView,
} from '../context/uploader-context'
import Icon from './Icon'
import FileItem from './FileItem.vue'
import FileHero from './FileHero.vue'
import UploaderHeader from './shared/UploaderHeader.vue'
import ProgressBar from './shared/ProgressBar.vue'
import FileSuccessCheck from './shared/FileSuccessCheck.vue'
import { isListViewForced } from '../lib/view-mode'
import { useTilesPerRow } from '../composables/use-tiles-per-row'

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

const { viewMode, sourceOverlayOpen, openSourceOverlay } = useUploaderView()
const { activeSource } = useUploaderSource()
const { files, leavingFileIds } = useUploaderFiles()
const { translations: tr } = useUploaderI18n()
const {
    upload: {
        startUpload,
        retryUpload,
        uploadStatus,
        uploadError,
        uploadErrorCode,
        totalProgress,
        uploadSpeed,
        uploadEta,
        uploadedBytes,
        totalBytes,
    },
    handleDone,
    handleCancel,
    handlePause,
    handleResume,
} = useUploaderUploadControls()
const {
    isProcessing,
    resumable,
    limit,
    quietCompletion,
    icons: { ContainerAddMoreIcon },
} = useUploaderOptions()
const {
    isDark: dark,
    slotOverrides: slotClasses,
    slots: themeSlots,
} = useUploaderTheme()

const scrollRef = ref<HTMLDivElement | null>(null)

// Render in CORE's insertion order (FileManager's Map preserves it, stable
// across renders and unchanged by in-place updateFile). A file added after
// others must appear LAST, never re-sorted into the middle alphabetically
// (round-7 item 3). Folder uploads already add folder-by-folder, so grouping
// survives without a sort.
const orderedFiles = computed(() => Array.from(files.value.values()))

const isSingle = computed(() => orderedFiles.value.length === 1)

// Adaptive layout rule: the square-tile grid is only honored when every tile
// fits in ONE row of the fixed-height panel. tilesPerRow is measured from the
// scroll container (160px min tile + 16px gap); past it the row list is FORCED
// and UploaderHeader hides the grid/list toggle.
const tilesPerRow = useTilesPerRow(scrollRef)
const forcedList = computed(() =>
    isListViewForced(orderedFiles.value.length, tilesPerRow.value),
)
const effectiveViewMode = computed(() =>
    forcedList.value ? 'list' : viewMode.value,
)

const shouldVirtualize = computed(
    () =>
        orderedFiles.value.length >= VIRTUAL_SCROLL_THRESHOLD &&
        effectiveViewMode.value !== 'grid',
)

const virtualizer = useVirtualizer(
    computed(() => ({
        count: orderedFiles.value.length,
        getScrollElement: () => scrollRef.value,
        estimateSize: () => ESTIMATED_ITEM_HEIGHT,
        overscan: 5,
        enabled: shouldVirtualize.value,
    })),
)

const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const virtualRows = computed(() =>
    virtualItems.value.flatMap((virtualItem) => {
        const file = orderedFiles.value[virtualItem.index]
        return file ? [{ virtualItem, file }] : []
    }),
)
const totalSize = computed(() => virtualizer.value.getTotalSize())

const isUploading = computed(() => isUploadActive(uploadStatus.value))
// When the add-more source surface is up (overlay open, or a source chosen
// while files exist), this list stays mounted but dimmed and inert behind it.
const dimmed = computed(() => sourceOverlayOpen.value || !!activeSource.value)
const heroLeaving = computed(
    () =>
        isSingle.value &&
        !!orderedFiles.value[0] &&
        leavingFileIds.value.has(orderedFiles.value[0].id),
)
// Quiet completion (item 7): a successful run under `quietCompletion` shows ONLY
// the checkmark overlay — Done/add-more/CTA are all suppressed and the host
// takes over via the completion callbacks. Wins over 6a's continue flow.
const quietDone = computed(
    () => !!quietCompletion && uploadStatus.value === UploadStatus.SUCCESSFUL,
)
const canAddMore = computed(
    () =>
        limit > 1 &&
        files.value.size < limit &&
        !isUploading.value &&
        !isProcessing &&
        !quietDone.value,
)

const isGrid = computed(
    () => files.value.size > 1 && effectiveViewMode.value === 'grid',
)
const gridStyle = computed(() =>
    isGrid.value
        ? { gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }
        : undefined,
)

function onUploadClick() {
    void startUpload().catch(() => undefined)
}

function onRetryClick() {
    void retryUpload().catch(() => undefined)
}
</script>

<template>
    <div
        data-testid="upup-file-list"
        data-upup-slot="file-list"
        :inert="dimmed || undefined"
        :class="
            cn(
                'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
                {
                    'upup-hidden': !files.size,
                    'upup-opacity-50 upup-blur-[2px] upup-pointer-events-none':
                        dimmed,
                },
                themeSlots?.fileList?.root,
            )
        "
    >
        <div role="status" aria-live="polite" class="upup-sr-only">
            {{ t(plural(tr, 'filesSelected', files.size), { count: files.size }) }}
        </div>

        <UploaderHeader
            :handle-cancel="handleCancel"
            :forced-list="forcedList"
            :hide-add-more="quietDone"
        />

        <!-- Quiet-completion overlay (item 7): checkmark only, no CTAs. The fx
             classes on FileSuccessCheck die under data-motion='off' (it then
             simply appears drawn), so this satisfies the static-state rule. -->
        <div
            v-if="quietDone"
            data-testid="upup-complete-check"
            data-upup-slot="complete-check"
            role="status"
            :class="
                cn(
                    'upup-absolute upup-inset-0 upup-z-20 upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-backdrop-blur-[1px]',
                    dark ? 'upup-bg-[#04080f]/40' : 'upup-bg-white/50',
                )
            "
        >
            <FileSuccessCheck :size="56" />
            <span
                :class="
                    cn(
                        'upup-text-sm upup-font-medium',
                        dark ? 'upup-text-[#e2e8f0]' : 'upup-text-[#1e293b]',
                    )
                "
            >
                {{ tr.announceUploadComplete }}
            </span>
        </div>

        <div
            ref="scrollRef"
            :class="
                cn(
                    'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-p-3',
                    dark ? 'upup-bg-transparent' : 'upup-bg-black/[0.075]',
                    slotClasses.fileListContainer,
                )
            "
        >
            <!-- Single-file HERO -->
            <div
                v-if="isSingle"
                role="list"
                :class="
                    cn(
                        'upup-animate-fx-enter upup-flex upup-min-h-0 upup-flex-1 upup-flex-col',
                        heroLeaving && 'upup-animate-fx-exit upup-overflow-hidden',
                    )
                "
            >
                <FileHero :file="orderedFiles[0]!" />
            </div>

            <!-- Virtualized list -->
            <div
                v-else-if="shouldVirtualize"
                role="list"
                data-upup-slot="file-list-virtual"
                :style="{ height: totalSize + 'px', position: 'relative' }"
                :class="
                    cn(
                        isProcessing && 'upup-pointer-events-none upup-opacity-75',
                        'upup-font-[Arial,Helvetica,sans-serif]',
                    )
                "
            >
                <div
                    v-for="{ virtualItem, file } in virtualRows"
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
                    <FileItem
                        :file="file"
                        :index="virtualItem.index"
                        :forced-list="forcedList"
                    />
                </div>
            </div>

            <!-- Standard rendering for small lists and grid mode. Grid is a
                 single row of auto-fit tiles that STRETCH to fill the row
                 (minmax(160px,1fr) — no dead columns at 2/3 files). It is only
                 reached when the tiles fit one row (else forcedList swaps to the
                 list), so the grid can never wrap the fixed panel. -->
            <div
                v-else
                role="list"
                :style="gridStyle"
                :class="
                    cn(
                        isProcessing && 'upup-pointer-events-none upup-opacity-75',
                        'upup-font-[Arial,Helvetica,sans-serif]',
                        isGrid
                            ? 'upup-grid upup-gap-4'
                            : 'upup-flex upup-flex-col upup-gap-3',
                        {
                            [slotClasses.fileListContainerInnerMultiple ?? '']:
                                slotClasses.fileListContainerInnerMultiple &&
                                files.size > 1,
                            [slotClasses.fileListContainerInnerSingle ?? '']:
                                slotClasses.fileListContainerInnerSingle &&
                                files.size === 1,
                        },
                    )
                "
            >
                <FileItem
                    v-for="(file, index) in orderedFiles"
                    :key="file.id"
                    :file="file"
                    :index="index"
                    :forced-list="forcedList"
                />
            </div>

            <!-- Full-width dashed "Add more" row (spec §4 state 3): a second
                 add-more affordance beneath the list/hero, opening the overlay. -->
            <button
                v-if="canAddMore"
                data-testid="upup-add-more"
                data-placement="footer"
                data-upup-slot="add-more"
                :class="
                    cn(
                        'upup-fx-hover-lift upup-fx-press upup-mt-2.5 upup-flex upup-flex-none upup-items-center upup-justify-center upup-gap-2 upup-whitespace-nowrap upup-rounded-xl upup-border-[1.5px] upup-border-dashed upup-px-3 upup-py-2 upup-text-[13px] upup-font-medium',
                        dark
                            ? 'upup-border-white/[0.16] upup-text-[#94a3b8]'
                            : 'upup-border-black/[0.16] upup-text-gray-500',
                        slotClasses.containerAddMoreButton,
                    )
                "
                @click="openSourceOverlay"
                :disabled="isUploading || isProcessing"
            >
                <component :is="ContainerAddMoreIcon" />
                {{ tr.addMore }}
            </button>
        </div>

        <div
            :class="
                cn(
                    'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
                    { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
                    slotClasses.fileListFooter,
                )
            "
        >
            <!-- Primary CTA only in a pre-run/idle state. Once a run is active it
                 becomes Cancel; when PAUSED it becomes Resume; SUCCESSFUL shows
                 Done and FAILED shows Retry (below). -->
            <button
                v-if="
                    uploadStatus !== UploadStatus.SUCCESSFUL &&
                    uploadStatus !== UploadStatus.FAILED &&
                    uploadStatus !== UploadStatus.PAUSED &&
                    !isUploading
                "
                data-testid="upup-upload-btn"
                :class="
                    cn(
                        'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-[#0ea5e9] upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': dark },
                        slotClasses.uploadButton,
                    )
                "
                @click="onUploadClick"
                :disabled="isUploadActive(uploadStatus) || isProcessing"
            >
                {{ t(plural(tr, 'uploadFiles', files.size), { count: files.size }) }}
            </button>
            <p
                v-if="uploadStatus === UploadStatus.FAILED && uploadError"
                data-testid="upup-upload-error"
                data-upup-slot="upload-error"
                :title="uploadErrorCode"
                class="upup-mr-auto upup-text-sm upup-text-red-600 dark:upup-text-red-400"
            >
                {{
                    uploadErrorCode
                        ? t(tr.uploadFailedWithCode, { code: uploadErrorCode })
                        : t(tr.uploadFailed, { message: uploadError })
                }}
            </p>
            <button
                v-if="uploadStatus === UploadStatus.FAILED"
                data-testid="upup-retry-btn"
                :class="
                    cn(
                        'upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-red-500 dark:upup-bg-red-500': dark },
                        slotClasses.uploadButton,
                    )
                "
                @click="onRetryClick"
            >
                {{ resumable?.protocol === 'multipart' ? tr.resumeUpload : tr.retryUpload }}
            </button>
            <button
                v-if="uploadStatus === UploadStatus.SUCCESSFUL && !quietCompletion"
                :class="
                    cn(
                        'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-[#0ea5e9] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                        { 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': dark },
                        slotClasses.uploadDoneButton,
                    )
                "
                @click="handleDone"
            >
                {{ tr.done }}
            </button>
            <div class="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                <div class="upup-flex upup-items-center upup-gap-2">
                    <!-- Cancel an in-flight run: aborts the active request(s) but
                         KEEPS the files (status → PAUSED) so the run can be
                         resumed. A true discard is the header's "remove all". -->
                    <button
                        v-if="uploadStatus === UploadStatus.UPLOADING"
                        data-testid="upup-upload-cancel"
                        :class="
                            cn(
                                'upup-fx-press upup-flex upup-h-7 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-full upup-bg-red-100 upup-px-3 upup-text-xs upup-font-medium upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
                                {
                                    'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30':
                                        dark,
                                },
                            )
                        "
                        @click="handlePause"
                        :aria-label="tr.cancel"
                        :title="tr.cancel"
                    >
                        <Icon name="x" :size="14" />
                        {{ tr.cancel }}
                    </button>
                    <button
                        v-if="uploadStatus === UploadStatus.PAUSED"
                        data-testid="upup-upload-resume"
                        :class="
                            cn(
                                'upup-fx-press upup-flex upup-h-7 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-full upup-bg-[#0ea5e9] upup-px-3 upup-text-xs upup-font-medium upup-text-white upup-transition-colors',
                                {
                                    'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
                                        dark,
                                },
                            )
                        "
                        @click="handleResume"
                        :aria-label="tr.resumeUpload"
                        :title="tr.resumeUpload"
                    >
                        <Icon name="player-play" :size="14" />
                        {{ tr.resumeUpload }}
                    </button>
                    <ProgressBar
                        class="upup-flex-1"
                        progress-bar-class-name="upup-rounded"
                        :progress="totalProgress"
                        :show-value="true"
                    />
                </div>
                <div
                    v-if="
                        (isUploadActive(uploadStatus) ||
                            uploadStatus === UploadStatus.PAUSED) &&
                        totalBytes > 0
                    "
                    :class="
                        cn(
                            'upup-flex upup-items-center upup-justify-between upup-text-[11px] upup-text-gray-500',
                            { 'upup-text-gray-400': dark },
                        )
                    "
                >
                    <span>
                        {{ formatBytes(uploadedBytes) }} of {{ formatBytes(totalBytes) }}
                        <template v-if="uploadSpeed > 0">
                            &middot; {{ formatBytes(uploadSpeed) }}/s
                        </template>
                    </span>
                    <span v-if="isUploadActive(uploadStatus) && uploadEta > 0">
                        {{ formatEta(uploadEta) }}
                    </span>
                    <span v-if="uploadStatus === UploadStatus.PAUSED">
                        {{ tr.paused }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
