import {
    Component,
    inject,
    OnDestroy,
    AfterViewInit,
    ViewChild,
    ElementRef,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
} from '@angular/core'
import {
    Virtualizer,
    observeElementRect,
    observeElementOffset,
    elementScroll,
    type VirtualItem,
} from '@tanstack/virtual-core'
import {
    formatUiMessage as t,
    pluralUiMessage as plural,
    UploadStatus,
    type UploadFile,
    type Translations,
} from '@upup/core'
import { isUploadActive, cn } from '@upup/core/internal'
import { UpupStore } from '../upup-store.service'
import { UploaderHeaderComponent } from './uploader-header.component'
import { ProgressBarComponent } from './progress-bar.component'
import { FileItemComponent } from './file-item.component'
import { PlayerPlayFilledIconComponent } from './icons/player-play-filled-icon.component'
import { PlayerPauseFilledIconComponent } from './icons/player-pause-filled-icon.component'
import { XIconComponent } from './icons/x-icon.component'
import { NgComponentOutlet } from '@angular/common'

const VIRTUAL_SCROLL_THRESHOLD = 20
const ESTIMATED_ITEM_HEIGHT = 76

/**
 * FileList — port of FileList.svelte + vanilla file-list.ts virtualizer wiring.
 *
 * Virtualization strategy (mirrors vanilla @tanstack/virtual-core approach):
 *   1. Create a Virtualizer imperatively in ngAfterViewInit after the scroll
 *      container is available via @ViewChild.
 *   2. Call _willUpdate() + _didMount() on creation (wires ResizeObserver +
 *      scroll listeners). Store the cleanup returned by _didMount().
 *   3. onChange callback calls cdr.markForCheck() so Angular re-renders
 *      virtual items reactively.
 *   4. On file count / shouldVirtualize change we call v.setOptions + _willUpdate()
 *      (mirrors vanilla's getVirtualizer() update branch).
 *   5. ngOnDestroy calls the cleanup fn (disconnects ResizeObserver + scroll listeners).
 *
 * data-testid="upup-file-list" and all sub-slot testids preserved.
 */
@Component({
    selector: 'upup-file-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        UploaderHeaderComponent,
        ProgressBarComponent,
        FileItemComponent,
        PlayerPlayFilledIconComponent,
        PlayerPauseFilledIconComponent,
        XIconComponent,
        NgComponentOutlet,
    ],
    template: `
        <div
            data-testid="upup-file-list"
            data-upup-slot="file-list"
            [class]="fileListClass"
        >
            <upup-main-box-header [handleCancel]="handleCancelFn" />

            <!-- Scroll container — @ViewChild binds this ref for the virtualizer -->
            <div #scrollContainer [class]="scrollContainerClass">
                @if (shouldVirtualize && virtualizer) {
                    <!-- Virtualized list: one absolute-positioned row per virtual item -->
                    <div
                        data-upup-slot="file-list-virtual"
                        [style]="virtualContainerStyle"
                        [class]="innerListClass"
                    >
                        @for (vi of virtualItems; track vi.key) {
                            <div
                                [attr.data-index]="vi.index"
                                [style]="virtualRowStyle(vi)"
                            >
                                <upup-file-item
                                    [file]="sortedFiles[vi.index]"
                                />
                            </div>
                        }
                    </div>
                } @else {
                    <!-- Standard (non-virtual) list -->
                    <div [class]="standardInnerClass">
                        @for (file of sortedFiles; track file.id) {
                            <upup-file-item [file]="file" />
                        }
                    </div>
                }
            </div>

            <!-- Overall progress bar -->
            <upup-progress-bar
                class="upup-px-3"
                [progress]="store.totalProgress()"
                [showValue]="true"
            />

            <!-- Footer: upload / retry / done + pause/cancel controls + ETA -->
            <div [class]="footerClass">
                <!-- Upload button -->
                @if (
                    store.uploadStatus() !== UploadStatus.SUCCESSFUL &&
                    store.uploadStatus() !== UploadStatus.FAILED
                ) {
                    <button
                        data-testid="upup-upload-btn"
                        [class]="uploadButtonClass"
                        (click)="onUploadClick()"
                        [disabled]="
                            isUploadActive(store.uploadStatus()) ||
                            store.uploadStatus() === UploadStatus.PAUSED ||
                            store.uiProps.isProcessing
                        "
                    >
                        {{ uploadButtonText }}
                    </button>
                }

                <!-- Upload-error message -->
                @if (
                    store.uploadStatus() === UploadStatus.FAILED &&
                    store.uploadError()
                ) {
                    <p
                        data-testid="upup-upload-error"
                        data-upup-slot="upload-error"
                        [attr.title]="store.uploadErrorCode()"
                        class="upup-mr-auto upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                    >
                        {{ uploadErrorText }}
                    </p>
                }

                <!-- Retry button -->
                @if (store.uploadStatus() === UploadStatus.FAILED) {
                    <button
                        data-testid="upup-retry-btn"
                        [class]="retryButtonClass"
                        (click)="onRetryClick()"
                    >
                        {{ retryButtonText }}
                    </button>
                }

                <!-- Done button -->
                @if (store.uploadStatus() === UploadStatus.SUCCESSFUL) {
                    <button
                        [class]="doneButtonClass"
                        (click)="store.handleDone()"
                    >
                        {{ store.translations().done }}
                    </button>
                }

                <!-- Pause / cancel / ETA area -->
                <div class="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                    <div class="upup-flex upup-items-center upup-gap-2">
                        @if (
                            store.uiProps.resumable?.protocol === 'multipart' &&
                            (isUploadActive(store.uploadStatus()) ||
                                store.uploadStatus() === UploadStatus.PAUSED)
                        ) {
                            <button
                                data-testid="upup-upload-pause-toggle"
                                [class]="pauseToggleClass"
                                (click)="
                                    store.uploadStatus() === UploadStatus.PAUSED
                                        ? store.handleResume()
                                        : store.handlePause()
                                "
                                [attr.aria-label]="
                                    store.uploadStatus() === UploadStatus.PAUSED
                                        ? store.translations().resumeUpload
                                        : store.translations().pauseUpload
                                "
                                [attr.title]="
                                    store.uploadStatus() === UploadStatus.PAUSED
                                        ? store.translations().resumeUpload
                                        : store.translations().pauseUpload
                                "
                            >
                                @if (
                                    store.uploadStatus() === UploadStatus.PAUSED
                                ) {
                                    <upup-player-play-filled-icon [size]="14" />
                                } @else {
                                    <upup-player-pause-filled-icon
                                        [size]="14"
                                    />
                                }
                            </button>

                            <button
                                data-testid="upup-upload-cancel-btn"
                                [class]="cancelBtnClass"
                                (click)="store.handleCancel()"
                            >
                                <upup-x-icon [size]="14" />
                            </button>
                        }

                        @if (showProgressText) {
                            <span [class]="progressTextClass">
                                {{ progressText }}
                            </span>
                        }
                    </div>

                    @if (
                        isUploadActive(store.uploadStatus()) &&
                        store.uploadEta() > 0
                    ) {
                        <span class="upup-text-[11px] upup-text-gray-500">{{
                            etaText
                        }}</span>
                    }

                    @if (store.uploadStatus() === UploadStatus.PAUSED) {
                        <span>{{ store.translations().paused }}</span>
                    }
                </div>
            </div>
        </div>
    `,
})
export class FileListComponent implements AfterViewInit, OnDestroy {
    readonly store = inject(UpupStore)
    private cdr = inject(ChangeDetectorRef)

    // Expose for template
    readonly UploadStatus = UploadStatus
    readonly isUploadActive = isUploadActive

    @ViewChild('scrollContainer')
    scrollContainerRef!: ElementRef<HTMLDivElement>

    // ── Virtualizer state ─────────────────────────────────────────────────────
    virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement> | null = null
    private virtualizerCleanup: (() => void) | null = null
    /** Current virtual items — refreshed each render cycle by getVirtualItems(). */
    virtualItems: VirtualItem[] = []
    /** ngDoCheck change guards — avoid re-sorting + _willUpdate() every CD tick. */
    private prevVirtCount = -1
    private prevShouldVirt = false

    // ── Derived from store (called in template) ────────────────────────────────

    get sortedFiles(): UploadFile[] {
        return Array.from(this.store.files().values()).sort((a, b) => {
            const pa = a.relativePath ?? a.name
            const pb = b.relativePath ?? b.name
            return pa.localeCompare(pb) || a.name.localeCompare(b.name)
        })
    }

    get shouldVirtualize(): boolean {
        return (
            this.sortedFiles.length >= VIRTUAL_SCROLL_THRESHOLD &&
            this.store.viewMode() !== 'grid'
        )
    }

    get translations(): Translations {
        return this.store.translations()
    }

    // ── Virtualizer computed styles ───────────────────────────────────────────

    get virtualContainerStyle(): string {
        const totalSize = this.virtualizer?.getTotalSize() ?? 0
        return `height: ${totalSize}px; position: relative;`
    }

    virtualRowStyle(vi: VirtualItem): string {
        return `position: absolute; top: 0; left: 0; width: 100%; transform: translateY(${vi.start}px); padding-bottom: 12px;`
    }

    // ── Class builders ────────────────────────────────────────────────────────

    get fileListClass(): string {
        const isAddingMore = this.store.isAddingMore()
        const activeSource = this.store.activeSource()
        const files = this.store.files()
        const themeSlots = this.store.slots()
        return cn(
            'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
            { 'upup-hidden': isAddingMore || !!activeSource || !files.size },
            themeSlots.fileList?.root ?? '',
        )
    }

    get scrollContainerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-bg-black/[0.075] upup-p-3',
            { 'upup-bg-white/10 dark:upup-bg-white/10': dark },
            slotClasses.fileListContainer ?? '',
        )
    }

    get innerListClass(): string {
        return cn(
            this.store.uiProps.isProcessing
                ? 'upup-pointer-events-none upup-opacity-75'
                : '',
            'upup-font-[Arial,Helvetica,sans-serif]',
        )
    }

    get standardInnerClass(): string {
        const isProcessing = this.store.uiProps.isProcessing
        const slotClasses = this.store.slotOverrides()
        const sortedFiles = this.sortedFiles
        const grid = this.store.viewMode() === 'grid'
        return cn(
            isProcessing ? 'upup-pointer-events-none upup-opacity-75' : '',
            'upup-flex upup-flex-col upup-gap-3 upup-font-[Arial,Helvetica,sans-serif]',
            {
                'md:upup-grid md:upup-gap-y-6': sortedFiles.length > 1 && grid,
                'md:upup-grid-cols-2': sortedFiles.length > 1 && grid,
                'upup-flex-1': sortedFiles.length === 1,
            },
            {
                [slotClasses.fileListContainerInnerMultiple ?? '']:
                    !!slotClasses.fileListContainerInnerMultiple &&
                    sortedFiles.length > 1,
                [slotClasses.fileListContainerInnerSingle ?? '']:
                    !!slotClasses.fileListContainerInnerSingle &&
                    sortedFiles.length === 1,
            },
        )
    }

    get footerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
            { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
            slotClasses.fileListFooter ?? '',
        )
    }

    get uploadButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
            { 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': dark },
            slotClasses.uploadButton ?? '',
        )
    }

    get retryButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
            { 'upup-bg-red-500 dark:upup-bg-red-500': dark },
            slotClasses.uploadButton ?? '',
        )
    }

    get doneButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
            { 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]': dark },
            slotClasses.uploadDoneButton ?? '',
        )
    }

    get pauseToggleClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-gray-200 upup-text-gray-700 upup-transition-colors hover:upup-bg-gray-300',
            { 'upup-bg-white/10 upup-text-white hover:upup-bg-white/20': dark },
        )
    }

    get cancelBtnClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full upup-bg-red-100 upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
            {
                'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30':
                    dark,
            },
        )
    }

    get showProgressText(): boolean {
        return (
            isUploadActive(this.store.uploadStatus()) ||
            this.store.uploadStatus() === UploadStatus.PAUSED
        )
    }

    get progressTextClass(): string {
        const dark = this.store.isDark()
        return cn('upup-text-[11px] upup-text-gray-500', {
            'upup-text-gray-400': dark,
        })
    }

    get progressText(): string {
        const speed = this.store.uploadSpeed()
        if (!speed) return ''
        const tr = this.translations
        const mb = speed / (1024 * 1024)
        return `${mb.toFixed(1)} ${tr.mb}/s`
    }

    get etaText(): string {
        const eta = this.store.uploadEta()
        if (eta <= 0 || !isFinite(eta)) return ''
        const m = Math.floor(eta / 60)
        const s = eta % 60
        if (m > 0) return `${m}m ${s}s left`
        return `${s}s left`
    }

    get uploadButtonText(): string {
        const tr = this.translations
        const count = this.store.files().size
        return t(plural(tr, 'uploadFiles', count), { count })
    }

    get retryButtonText(): string {
        const tr = this.translations
        return this.store.uiProps.resumable?.protocol === 'multipart'
            ? tr.resumeUpload
            : tr.retryUpload
    }

    get uploadErrorText(): string {
        const tr = this.translations
        const code = this.store.uploadErrorCode()
        const message = this.store.uploadError() ?? ''
        return code
            ? t(tr.uploadFailedWithCode, { code })
            : t(tr.uploadFailed, { message })
    }

    // Bound fn for UploaderHeader (avoids arrow-fn re-creation in template)
    readonly handleCancelFn = (): void => {
        this.store.handleCancel()
    }

    // ── Upload action handlers ─────────────────────────────────────────────────

    onUploadClick(): void {
        void this.store.startUpload().catch(() => undefined)
    }

    onRetryClick(): void {
        void this.store.retryUpload().catch(() => undefined)
    }

    // ── Virtualizer lifecycle ─────────────────────────────────────────────────

    ngAfterViewInit(): void {
        this.initVirtualizer()
    }

    ngOnDestroy(): void {
        this.destroyVirtualizer()
    }

    private initVirtualizer(): void {
        const scrollEl = this.scrollContainerRef?.nativeElement
        if (!scrollEl) return

        const count = this.sortedFiles.length

        const v = new Virtualizer<HTMLDivElement, HTMLDivElement>({
            count,
            getScrollElement: () => scrollEl,
            estimateSize: () => ESTIMATED_ITEM_HEIGHT,
            overscan: 5,
            enabled: this.shouldVirtualize,
            observeElementRect,
            observeElementOffset,
            scrollToFn: elementScroll,
            onChange: () => {
                // Refresh virtual items and trigger Angular's change detection.
                // Mirrors vanilla's onChange: () => ctx.invalidate()
                this.virtualItems = v.getVirtualItems()
                this.cdr.markForCheck()
            },
        })

        // _willUpdate() wires scroll element (attaches ResizeObserver + scroll
        // listeners via observeElementRect/observeElementOffset). Must be called
        // before first render — mirrors vanilla pattern.
        v._willUpdate()

        // _didMount() returns the public cleanup fn (disconnects ResizeObserver +
        // removes scroll listeners). Store it for ngOnDestroy.
        this.virtualizerCleanup = v._didMount()

        this.virtualizer = v
        // Seed virtualItems for first render
        this.virtualItems = v.getVirtualItems()
        this.cdr.markForCheck()
    }

    private destroyVirtualizer(): void {
        if (this.virtualizerCleanup) {
            this.virtualizerCleanup()
            this.virtualizerCleanup = null
        }
        this.virtualizer = null
    }

    // ── ngDoCheck: sync virtualizer with current file list ────────────────────
    // Guarded: only re-runs setOptions + _willUpdate() when the raw file COUNT or
    // the virtualization GATE actually changed. Computing the gate from the raw
    // files().size (not the O(n log n) sortedFiles getter) keeps this cheap and
    // prevents the self-amplifying re-sort-on-every-scroll-tick footgun.
    ngDoCheck(): void {
        const v = this.virtualizer
        if (!v) return
        const count = this.store.files().size // raw count, no sort
        const sv =
            count >= VIRTUAL_SCROLL_THRESHOLD &&
            this.store.viewMode() !== 'grid'
        if (count === this.prevVirtCount && sv === this.prevShouldVirt) return
        this.prevVirtCount = count
        this.prevShouldVirt = sv
        const scrollEl = this.scrollContainerRef?.nativeElement
        if (!scrollEl) return
        v.setOptions({
            ...v.options,
            count,
            getScrollElement: () => scrollEl,
            estimateSize: () => ESTIMATED_ITEM_HEIGHT,
            overscan: 5,
            enabled: sv,
        })
        v._willUpdate()
        this.virtualItems = v.getVirtualItems()
    }
}
