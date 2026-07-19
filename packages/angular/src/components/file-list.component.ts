import {
    Component,
    inject,
    OnDestroy,
    AfterViewInit,
    ViewChild,
    ElementRef,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
    type Type,
} from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
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
} from '@upupjs/core'
import { isUploadActive, cn } from '@upupjs/core/internal'
import { UpupStore } from '../upup-store.service'
import { UploaderHeaderComponent } from './uploader-header.component'
import { ProgressBarComponent } from './progress-bar.component'
import { FileItemComponent } from './file-item.component'
import { FileHeroComponent } from './file-hero.component'
import { FileSuccessCheckComponent } from './shared/file-success-check.component'
import { IconComponent } from './icon.component'
import { isListViewForced } from '../lib/view-mode'
import { TilesPerRowObserver } from '../lib/use-tiles-per-row'

const VIRTUAL_SCROLL_THRESHOLD = 20
const ESTIMATED_ITEM_HEIGHT = 76

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] ?? ''}`
}

function formatEta(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}m ${s}s left`
    return `${s}s left`
}

/**
 * FileList — port of FileList. Renders in core insertion order (no sort). Single
 * file → FileHero; multiple → fluid auto-fit grid (inline gridTemplateColumns) or
 * forced list. Adaptive: the tiles-per-row ResizeObserver forces the row list when
 * a grid row would overflow the fixed-height panel (header then hides the toggle).
 */
@Component({
    selector: 'upup-file-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        UploaderHeaderComponent,
        ProgressBarComponent,
        FileItemComponent,
        FileHeroComponent,
        FileSuccessCheckComponent,
        IconComponent,
        NgComponentOutlet,
    ],
    template: `
        <div
            data-testid="upup-file-list"
            data-upup-slot="file-list"
            [attr.inert]="dimmed ? '' : null"
            [class]="fileListClass"
        >
            <div role="status" aria-live="polite" class="upup-sr-only">
                {{ selectionCountText }}
            </div>

            <upup-uploader-header
                [handleCancel]="handleCancelFn"
                [forcedList]="forcedList"
                [hideAddMore]="quietDone"
            />

            @if (quietDone) {
                <div
                    data-testid="upup-complete-check"
                    data-upup-slot="complete-check"
                    role="status"
                    [class]="completeCheckClass"
                >
                    <upup-file-success-check [size]="56" />
                    <span [class]="completeTextClass">{{
                        store.translations().announceUploadComplete
                    }}</span>
                </div>
            }

            <div #scrollContainer [class]="scrollContainerClass">
                @if (isSingle) {
                    <div role="list" [class]="heroBranchClass">
                        <upup-file-hero [file]="orderedFiles[0]" />
                    </div>
                } @else if (shouldVirtualize && virtualizer) {
                    <div
                        role="list"
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
                                    [file]="orderedFiles[vi.index]"
                                    [index]="vi.index"
                                    [forcedList]="forcedList"
                                />
                            </div>
                        }
                    </div>
                } @else {
                    <div
                        role="list"
                        [style.grid-template-columns]="gridTemplateColumns"
                        [class]="standardInnerClass"
                    >
                        @for (
                            file of orderedFiles;
                            track file.id;
                            let i = $index
                        ) {
                            <upup-file-item
                                [file]="file"
                                [index]="i"
                                [forcedList]="forcedList"
                            />
                        }
                    </div>
                }

                @if (canAddMore) {
                    <button
                        data-testid="upup-add-more"
                        data-placement="footer"
                        data-upup-slot="add-more"
                        [class]="footerAddMoreClass"
                        (click)="store.openSourceOverlay()"
                        [disabled]="isUploading || store.uiProps.isProcessing"
                    >
                        <ng-container
                            [ngComponentOutlet]="containerAddMoreIcon"
                        />
                        {{ store.translations().addMore }}
                    </button>
                }
            </div>

            <div [class]="footerClass">
                @if (showUploadButton) {
                    <button
                        data-testid="upup-upload-btn"
                        [class]="uploadButtonClass"
                        (click)="onUploadClick()"
                        [disabled]="
                            isUploadActive(store.uploadStatus()) ||
                            store.uiProps.isProcessing
                        "
                    >
                        {{ uploadButtonText }}
                    </button>
                }

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

                @if (store.uploadStatus() === UploadStatus.FAILED) {
                    <button
                        data-testid="upup-retry-btn"
                        [class]="retryButtonClass"
                        (click)="onRetryClick()"
                    >
                        {{ retryButtonText }}
                    </button>
                }

                @if (
                    store.uploadStatus() === UploadStatus.SUCCESSFUL &&
                    !store.uiProps.quietCompletion
                ) {
                    <button
                        [class]="doneButtonClass"
                        (click)="store.handleDone()"
                    >
                        {{ store.translations().done }}
                    </button>
                }

                <div class="upup-flex upup-flex-1 upup-flex-col upup-gap-1">
                    <div class="upup-flex upup-items-center upup-gap-2">
                        @if (store.uploadStatus() === UploadStatus.UPLOADING) {
                            <button
                                data-testid="upup-upload-cancel"
                                [class]="cancelButtonClass"
                                (click)="store.handlePause()"
                                [attr.aria-label]="store.translations().cancel"
                                [title]="store.translations().cancel"
                            >
                                <upup-icon name="x" [size]="14" />
                                {{ store.translations().cancel }}
                            </button>
                        }
                        @if (store.uploadStatus() === UploadStatus.PAUSED) {
                            <button
                                data-testid="upup-upload-resume"
                                [class]="resumeButtonClass"
                                (click)="store.handleResume()"
                                [attr.aria-label]="
                                    store.translations().resumeUpload
                                "
                                [title]="store.translations().resumeUpload"
                            >
                                <upup-icon name="player-play" [size]="14" />
                                {{ store.translations().resumeUpload }}
                            </button>
                        }
                        <upup-progress-bar
                            [className]="'upup-flex-1'"
                            progressBarClassName="upup-rounded"
                            [progress]="store.totalProgress()"
                            [showValue]="true"
                        />
                    </div>
                    @if (showBytesRow) {
                        <div [class]="bytesRowClass">
                            <span>{{ bytesText }}</span>
                            @if (
                                isUploadActive(store.uploadStatus()) &&
                                store.uploadEta() > 0
                            ) {
                                <span>{{ etaText }}</span>
                            }
                            @if (store.uploadStatus() === UploadStatus.PAUSED) {
                                <span>{{ store.translations().paused }}</span>
                            }
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
})
export class FileListComponent implements AfterViewInit, OnDestroy {
    readonly store = inject(UpupStore)
    private cdr = inject(ChangeDetectorRef)

    readonly UploadStatus = UploadStatus
    readonly isUploadActive = isUploadActive

    @ViewChild('scrollContainer')
    scrollContainerRef?: ElementRef<HTMLDivElement>

    private readonly tiles = new TilesPerRowObserver()

    virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement> | null = null
    private virtualizerCleanup: (() => void) | null = null
    virtualItems: VirtualItem[] = []
    private prevVirtCount = -1
    private prevShouldVirt = false

    // ── Derived from store (insertion order — NO sort) ──────────────────────────

    get orderedFiles(): UploadFile[] {
        return Array.from(this.store.files().values())
    }

    get isSingle(): boolean {
        return this.orderedFiles.length === 1
    }

    get forcedList(): boolean {
        return isListViewForced(
            this.orderedFiles.length,
            this.tiles.tilesPerRow(),
        )
    }

    get effectiveViewMode(): 'grid' | 'list' {
        return this.forcedList ? 'list' : this.store.viewMode()
    }

    get shouldVirtualize(): boolean {
        return (
            this.orderedFiles.length >= VIRTUAL_SCROLL_THRESHOLD &&
            this.effectiveViewMode !== 'grid'
        )
    }

    get isUploading(): boolean {
        return isUploadActive(this.store.uploadStatus())
    }

    get dimmed(): boolean {
        return this.store.sourceOverlayOpen() || !!this.store.activeSource()
    }

    get quietDone(): boolean {
        return (
            this.store.uiProps.quietCompletion &&
            this.store.uploadStatus() === UploadStatus.SUCCESSFUL
        )
    }

    get canAddMore(): boolean {
        return (
            this.store.uiProps.limit > 1 &&
            this.store.files().size < this.store.uiProps.limit &&
            !this.isUploading &&
            !this.store.uiProps.isProcessing &&
            !this.quietDone
        )
    }

    get containerAddMoreIcon(): Type<unknown> {
        return this.store.uiProps.icons.ContainerAddMoreIcon as Type<unknown>
    }

    get selectionCountText(): string {
        const tr = this.store.translations()
        const count = this.store.files().size
        return t(plural(tr, 'filesSelected', count), { count })
    }

    get showUploadButton(): boolean {
        const s = this.store.uploadStatus()
        return (
            s !== UploadStatus.SUCCESSFUL &&
            s !== UploadStatus.FAILED &&
            s !== UploadStatus.PAUSED &&
            !this.isUploading
        )
    }

    get showBytesRow(): boolean {
        const s = this.store.uploadStatus()
        return (
            (isUploadActive(s) || s === UploadStatus.PAUSED) &&
            this.store.totalBytes() > 0
        )
    }

    // ── Virtualizer computed styles ───────────────────────────────────────────

    get virtualContainerStyle(): string {
        const totalSize = this.virtualizer?.getTotalSize() ?? 0
        return `height: ${totalSize}px; position: relative;`
    }

    virtualRowStyle(vi: VirtualItem): string {
        return `position: absolute; top: 0; left: 0; width: 100%; transform: translateY(${vi.start}px); padding-bottom: 12px;`
    }

    get gridTemplateColumns(): string | null {
        return this.store.files().size > 1 && this.effectiveViewMode === 'grid'
            ? 'repeat(auto-fit, minmax(160px, 1fr))'
            : null
    }

    // ── Class builders ────────────────────────────────────────────────────────

    get fileListClass(): string {
        const themeSlots = this.store.slots()
        return cn(
            'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
            {
                'upup-hidden': !this.store.files().size,
                'upup-opacity-50 upup-blur-[2px] upup-pointer-events-none':
                    this.dimmed,
            },
            themeSlots.fileList?.root ?? '',
        )
    }

    get scrollContainerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-p-3',
            dark ? 'upup-bg-transparent' : 'upup-bg-black/[0.075]',
            slotClasses.fileListContainer ?? '',
        )
    }

    get heroBranchClass(): string {
        const first = this.orderedFiles[0]
        const heroLeaving =
            this.isSingle &&
            first !== undefined &&
            this.store.leavingFileIds().has(first.id)
        return cn(
            'upup-animate-fx-enter upup-flex upup-min-h-0 upup-flex-1 upup-flex-col',
            heroLeaving && 'upup-animate-fx-exit upup-overflow-hidden',
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
        const grid =
            this.store.files().size > 1 && this.effectiveViewMode === 'grid'
        return cn(
            isProcessing ? 'upup-pointer-events-none upup-opacity-75' : '',
            'upup-font-[Arial,Helvetica,sans-serif]',
            grid
                ? 'upup-grid upup-gap-4'
                : 'upup-flex upup-flex-col upup-gap-3',
            {
                [slotClasses.fileListContainerInnerMultiple ?? '']:
                    !!slotClasses.fileListContainerInnerMultiple &&
                    this.store.files().size > 1,
                [slotClasses.fileListContainerInnerSingle ?? '']:
                    !!slotClasses.fileListContainerInnerSingle &&
                    this.store.files().size === 1,
            },
        )
    }

    get footerAddMoreClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-fx-hover-lift upup-fx-press upup-mt-2.5 upup-flex upup-flex-none upup-items-center upup-justify-center upup-gap-2 upup-whitespace-nowrap upup-rounded-xl upup-border-[1.5px] upup-border-dashed upup-px-3 upup-py-2 upup-text-[13px] upup-font-medium',
            dark
                ? 'upup-border-white/[0.16] upup-text-[#94a3b8]'
                : 'upup-border-black/[0.16] upup-text-gray-500',
            slotClasses.containerAddMoreButton ?? '',
        )
    }

    get completeCheckClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-absolute upup-inset-0 upup-z-20 upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-backdrop-blur-[1px]',
            dark ? 'upup-bg-[#04080f]/40' : 'upup-bg-white/50',
        )
    }

    get completeTextClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-text-sm upup-font-medium',
            dark ? 'upup-text-[#e2e8f0]' : 'upup-text-[#1e293b]',
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
            'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-[#0ea5e9] upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
            { 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': dark },
            slotClasses.uploadButton ?? '',
        )
    }

    get retryButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
            { 'upup-bg-red-500 dark:upup-bg-red-500': dark },
            slotClasses.uploadButton ?? '',
        )
    }

    get doneButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-fx-sheen-sweep upup-fx-press upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-[#0ea5e9] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
            { 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': dark },
            slotClasses.uploadDoneButton ?? '',
        )
    }

    get cancelButtonClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-fx-press upup-flex upup-h-7 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-full upup-bg-red-100 upup-px-3 upup-text-xs upup-font-medium upup-text-red-700 upup-transition-colors hover:upup-bg-red-200',
            {
                'upup-bg-red-500/20 upup-text-red-100 hover:upup-bg-red-500/30':
                    dark,
            },
        )
    }

    get resumeButtonClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-fx-press upup-flex upup-h-7 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-full upup-bg-[#0ea5e9] upup-px-3 upup-text-xs upup-font-medium upup-text-white upup-transition-colors',
            { 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': dark },
        )
    }

    get bytesRowClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-flex upup-items-center upup-justify-between upup-text-[11px] upup-text-gray-500',
            { 'upup-text-gray-400': dark },
        )
    }

    get bytesText(): string {
        const uploaded = formatBytes(this.store.uploadedBytes())
        const total = formatBytes(this.store.totalBytes())
        const speed = this.store.uploadSpeed()
        const speedPart = speed > 0 ? ` · ${formatBytes(speed)}/s` : ''
        return `${uploaded} of ${total}${speedPart}`
    }

    get etaText(): string {
        return formatEta(this.store.uploadEta())
    }

    get uploadButtonText(): string {
        const tr = this.store.translations()
        const count = this.store.files().size
        return t(plural(tr, 'uploadFiles', count), { count })
    }

    get retryButtonText(): string {
        const tr = this.store.translations()
        return this.store.uiProps.resumable?.protocol === 'multipart'
            ? tr.resumeUpload
            : tr.retryUpload
    }

    get uploadErrorText(): string {
        const tr = this.store.translations()
        const code = this.store.uploadErrorCode()
        const message = this.store.uploadError() ?? ''
        return code
            ? t(tr.uploadFailedWithCode, { code })
            : t(tr.uploadFailed, { message })
    }

    readonly handleCancelFn = (): void => {
        this.store.handleCancel()
    }

    onUploadClick(): void {
        void this.store.startUpload().catch(() => undefined)
    }

    onRetryClick(): void {
        void this.store.retryUpload().catch(() => undefined)
    }

    // ── Virtualizer + tiles-per-row lifecycle ──────────────────────────────────

    ngAfterViewInit(): void {
        this.tiles.observe(this.scrollContainerRef?.nativeElement ?? null)
        this.initVirtualizer()
    }

    ngOnDestroy(): void {
        this.tiles.destroy()
        this.destroyVirtualizer()
    }

    private initVirtualizer(): void {
        const scrollEl = this.scrollContainerRef?.nativeElement
        if (!scrollEl) return
        const count = this.orderedFiles.length
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
                this.virtualItems = v.getVirtualItems()
                this.cdr.markForCheck()
            },
        })
        v._willUpdate()
        this.virtualizerCleanup = v._didMount()
        this.virtualizer = v
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

    ngDoCheck(): void {
        const v = this.virtualizer
        if (!v) return
        const count = this.store.files().size
        const sv =
            count >= VIRTUAL_SCROLL_THRESHOLD &&
            this.effectiveViewMode !== 'grid'
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
