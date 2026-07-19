import {
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
    computed,
    effect,
    inject,
} from '@angular/core'
import {
    cn,
    DragDropController,
    type DragDropSnapshot,
} from '@upupjs/core/internal'
import { UploadStatus, formatUiMessage } from '@upupjs/core'
import { UpupStore } from '../upup-store.service'
import { toSignalStore, type SignalStore } from '../lib/to-signal-store'
import { SourceViewComponent } from './source-view.component'
import { SourceSelectorComponent } from './source-selector.component'
import { FileListComponent } from './file-list.component'
import { devinoDark, devinoLight, logoDark, logoLight } from '../assets/logos'

/**
 * UploaderPanelComponent — port of UploaderPanel + useUploaderPanel.
 *
 * The dropzone frame, drag-over prompt, drop-rejection toast, add-more sheet
 * overlay, and the in-panel branding row all live here now (branding moved
 * inside the dashed frame). data-motion is written from the core motion gate;
 * the two-phase reverse-slide close is core-owned (sourceOverlayClosing) — never
 * gated on transitionend/animationend.
 */
@Component({
    selector: 'upup-uploader-panel',
    standalone: true,
    imports: [SourceViewComponent, SourceSelectorComponent, FileListComponent],
    template: `
        <div
            #panel
            data-testid="upup-dropzone"
            data-upup-slot="uploader-panel"
            [attr.data-motion]="store.motionMode()"
            role="region"
            [attr.aria-label]="store.translations().dropzoneLabel"
            [attr.aria-dropeffect]="isDragging() ? 'copy' : 'none'"
            (dragover)="handleDragOver($event)"
            (dragleave)="handleDragLeave($event)"
            (drop)="handleDrop($event)"
            (paste)="handlePaste($event)"
            [class]="boxClass()"
        >
            <div role="status" aria-live="polite" class="upup-sr-only">
                {{ uploadAnnouncement() }}
            </div>

            @if (store.dropRejected()) {
                <div
                    data-testid="upup-drop-rejected-toast"
                    data-upup-slot="drop-rejected-toast"
                    role="status"
                    aria-live="polite"
                    [class]="toastClass()"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.9"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                        class="upup-flex-none"
                    >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                    </svg>
                    <span>{{ dropRejectedText() }}</span>
                </div>
            }

            @if (!store.isOnline()) {
                <div [class]="offlineBannerClass()">
                    No internet connection — uploads will resume when you
                    reconnect.
                </div>
            }

            @if (showDropzoneFrame()) {
                <svg
                    data-upup-slot="dropzone-frame"
                    aria-hidden="true"
                    class="upup-pointer-events-none upup-absolute upup-inset-1 upup-h-[calc(100%-0.5rem)] upup-w-[calc(100%-0.5rem)]"
                >
                    <rect
                        x="1"
                        y="1"
                        rx="14"
                        ry="14"
                        fill="none"
                        stroke-width="1.5"
                        stroke-dasharray="5 7"
                        [attr.stroke]="frameStroke()"
                        [class]="
                            absoluteIsDragging()
                                ? 'upup-animate-fx-dash-march'
                                : ''
                        "
                        style="width: calc(100% - 2px); height: calc(100% - 2px)"
                    />
                </svg>
            }

            @if (absoluteIsDragging()) {
                <div
                    data-testid="upup-drag-overlay"
                    data-upup-slot="drag-overlay"
                    aria-hidden="true"
                    [class]="dragOverlayClass()"
                >
                    <span [class]="dragBadgeClass()">
                        <svg
                            viewBox="0 0 24 24"
                            width="30"
                            height="30"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M12 4v11" />
                            <path d="m7 10 5 5 5-5" />
                            <path
                                d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"
                            />
                        </svg>
                    </span>
                    <span [class]="dragTextClass()">{{
                        store.translations().dropToUpload
                    }}</span>
                </div>
            }

            <div
                class="upup-relative upup-flex upup-min-h-0 upup-flex-1 upup-flex-col"
            >
                @if (!hasFiles()) {
                    @if (!!store.activeSource()) {
                        <upup-source-view />
                    } @else {
                        <upup-source-selector />
                    }
                }
                <upup-file-list />
            </div>

            @if (showSourceOverlay()) {
                <div
                    #overlay
                    data-upup-slot="source-overlay"
                    [attr.role]="store.sourceOverlayClosing() ? null : 'dialog'"
                    [attr.aria-modal]="
                        store.sourceOverlayClosing() ? null : 'true'
                    "
                    [attr.aria-label]="store.translations().addingMoreFiles"
                    (keydown)="onOverlayKeydown($event)"
                    [class]="overlayClass()"
                >
                    <button
                        type="button"
                        data-testid="upup-sheet-grip"
                        data-upup-slot="sheet-grip"
                        [attr.aria-label]="store.translations().overlayBack"
                        (click)="onGripClick()"
                        (pointerdown)="onGripPointerDown($event)"
                        (pointermove)="onGripPointerMove($event)"
                        (pointerup)="onGripPointerUp($event)"
                        class="upup-absolute upup-left-1/2 upup-top-1.5 upup-z-10 upup-flex upup-h-6 upup-w-20 upup--translate-x-1/2 upup-cursor-grab upup-touch-none upup-items-center upup-justify-center upup-rounded-full"
                    >
                        <span
                            aria-hidden="true"
                            [class]="gripBarClass()"
                        ></span>
                    </button>
                    @if (!!store.activeSource()) {
                        <upup-source-view />
                    } @else {
                        <upup-source-selector />
                    }
                </div>
            }

            @if (showBranding()) {
                <div
                    data-testid="upup-branding"
                    class="upup-flex upup-w-full upup-flex-none upup-flex-col upup-items-center upup-justify-between upup-gap-1 upup-px-6 upup-pb-5 upup-pt-1.5 md:upup-flex-row"
                >
                    <a
                        href="https://useupup.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="upup-flex upup-items-center upup-gap-[5px]"
                    >
                        @if (store.isDark()) {
                            <img
                                [src]="logoDark"
                                width="61"
                                height="13"
                                alt="logo-dark"
                            />
                        } @else {
                            <img
                                [src]="logoLight"
                                width="61"
                                height="13"
                                alt="logo-light"
                            />
                        }
                    </a>
                    <a
                        href="https://devino.ca/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="upup-flex upup-flex-row upup-items-center upup-justify-end upup-gap-1"
                    >
                        <span [class]="builtByClass()">
                            {{ store.translations().builtBy }}
                        </span>
                        @if (store.isDark()) {
                            <img
                                [src]="devinoDark"
                                width="61"
                                height="13"
                                alt="logo-dark"
                            />
                        } @else {
                            <img
                                [src]="devinoLight"
                                width="61"
                                height="13"
                                alt="logo-light"
                            />
                        }
                    </a>
                </div>
            }
        </div>
    `,
})
export class UploaderPanelComponent implements OnInit, OnDestroy {
    readonly store = inject(UpupStore)

    readonly logoDark = logoDark
    readonly logoLight = logoLight
    readonly devinoDark = devinoDark
    readonly devinoLight = devinoLight

    @ViewChild('panel') panelRef?: ElementRef<HTMLDivElement>
    @ViewChild('overlay') overlayRef?: ElementRef<HTMLDivElement>

    private dragController!: DragDropController
    private dragStore?: SignalStore<DragDropSnapshot>

    // Sheet swipe-to-dismiss (imperative — dragging must not re-render).
    private swipeStartY: number | null = null
    private swiped = false
    private triggerEl: HTMLElement | null = null

    constructor() {
        // Focus management: on open (or inner view swap) pull focus into the
        // overlay so keyboard/SR users don't land on the inert list underneath;
        // restore to the trigger once fully settled closed.
        effect(() => {
            const open = this.store.sourceOverlayOpen()
            const closing = this.store.sourceOverlayClosing()
            const active = !!this.store.activeSource()
            if (open || active) {
                queueMicrotask(() => {
                    const overlayEl = this.overlayRef?.nativeElement
                    if (!overlayEl) return
                    if (
                        !this.triggerEl &&
                        document.activeElement instanceof HTMLElement
                    )
                        this.triggerEl = document.activeElement
                    overlayEl
                        .querySelector<HTMLElement>('button:not([disabled])')
                        ?.focus()
                })
                return
            }
            if (!open && !closing && !active) {
                const trigger = this.triggerEl
                if (!trigger) return
                this.triggerEl = null
                if (trigger.isConnected) trigger.focus()
            }
        })
    }

    ngOnInit(): void {
        this.dragController = new DragDropController({
            core: this.store.core,
            orchestrator: this.store.orchestrator,
            setFiles: files => this.store.handleSetSelectedFiles(files),
            filesSize: () => this.store.orchestrator.getSnapshot().files.size,
            options: () => this.store.uiProps,
            props: () => ({
                disableDragDrop: this.store.uiProps.disableDragDrop,
                isProcessing: this.store.uiProps.isProcessing,
                folderUploadAllowDrop: this.store.uiProps.folderUploadAllowDrop,
            }),
            onReadonlyDropRejected: source => {
                this.store.flagDriveDropRejected(source)
            },
        })
        this.dragStore = toSignalStore(this.dragController)
        this.dragController.init()
    }

    ngOnDestroy(): void {
        this.dragController?.destroy()
        this.dragStore?.destroy()
    }

    // ── Drag-state signals ─────────────────────────────────────────────────────
    readonly isDragging = computed(
        () => this.dragStore?.state().isDragging ?? false,
    )
    readonly absoluteIsDragging = computed(
        () => this.dragStore?.state().absoluteIsDragging ?? false,
    )
    readonly absoluteHasBorder = computed(
        () => this.dragStore?.state().absoluteHasBorder ?? true,
    )

    readonly hasFiles = computed(() => this.store.files().size > 0)

    readonly showDropzoneFrame = computed(
        () =>
            this.absoluteHasBorder() &&
            !this.store.activeSource() &&
            !this.store.sourceOverlayOpen() &&
            !this.store.files().size,
    )

    readonly showSourceOverlay = computed(
        () =>
            this.hasFiles() &&
            (this.store.sourceOverlayOpen() ||
                this.store.sourceOverlayClosing() ||
                !!this.store.activeSource()),
    )

    readonly showBranding = computed(
        () =>
            !this.store.uiProps.mini &&
            this.store.uiProps.showBranding &&
            !this.store.activeSource() &&
            !this.hasFiles(),
    )

    readonly boxClass = computed(() => {
        const hasBorder = this.absoluteHasBorder()
        const dragging = this.isDragging()
        const absDragging = this.absoluteIsDragging()
        const showFrame = this.showDropzoneFrame()
        const dark = this.store.isDark()
        return cn(
            'upup-relative upup-flex upup-flex-1 upup-flex-col upup-overflow-hidden upup-rounded-lg',
            {
                'upup-border upup-border-[#0ea5e9]': hasBorder && !showFrame,
                'upup-border-[#38bdf8] dark:upup-border-[#38bdf8]':
                    hasBorder && !showFrame && dark,
                'upup-border-dashed': !dragging && !showFrame,
                'upup-bg-[#e0f2fe] upup-backdrop-blur-sm': absDragging && !dark,
                'upup-bg-[#0b2a3a] upup-backdrop-blur-sm dark:upup-bg-[#0b2a3a]':
                    absDragging && dark,
            },
        )
    })

    readonly offlineBannerClass = computed(() =>
        cn(
            'upup-absolute upup-inset-x-0 upup-top-0 upup-z-30 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
            { 'upup-bg-yellow-600': this.store.isDark() },
        ),
    )

    readonly toastClass = computed(() =>
        cn(
            'upup-animate-informer-in upup-absolute upup-inset-x-4 upup-top-4 upup-z-30 upup-flex upup-items-center upup-gap-2.5 upup-rounded-xl upup-px-3.5 upup-py-2.5 upup-text-[13px] upup-leading-snug upup-ring-1',
            this.store.isDark()
                ? 'upup-bg-rose-500/[0.14] upup-text-rose-200 upup-ring-rose-400/30'
                : 'upup-bg-rose-50 upup-text-rose-700 upup-ring-rose-300/60',
        ),
    )

    readonly dropRejectedText = computed(() =>
        formatUiMessage(this.store.translations().dropRejected, {
            provider: this.store.dropRejected() ?? '',
        }),
    )

    readonly dragOverlayClass = computed(() =>
        cn(
            'upup-animate-fx-view upup-pointer-events-none upup-absolute upup-inset-0 upup-z-10 upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-3',
            this.store.isDark() ? 'upup-bg-[#0b1220]/70' : 'upup-bg-white/70',
        ),
    )

    readonly dragBadgeClass = computed(() =>
        cn(
            'upup-flex upup-h-16 upup-w-16 upup-items-center upup-justify-center upup-rounded-2xl',
            this.store.isDark()
                ? 'upup-bg-[#38bdf8]/15 upup-text-[#38bdf8]'
                : 'upup-bg-[#0284c7]/10 upup-text-[#0284c7]',
        ),
    )

    readonly dragTextClass = computed(() =>
        cn(
            'upup-text-[15px] upup-font-semibold',
            this.store.isDark() ? 'upup-text-[#e2e8f0]' : 'upup-text-[#0f172a]',
        ),
    )

    readonly overlayClass = computed(() =>
        cn(
            'upup-absolute upup-inset-x-3 upup-bottom-3 upup-top-11 upup-z-20 upup-flex upup-flex-col upup-overflow-hidden upup-rounded-2xl upup-ring-1 upup-ring-inset upup-backdrop-blur-md',
            this.store.sourceOverlayClosing()
                ? 'upup-fx-overlay-close-slide upup-pointer-events-none'
                : 'upup-fx-overlay-slide',
            this.store.isDark()
                ? 'upup-bg-[#0b1220]/[0.85] upup-ring-white/[0.08] upup-shadow-[0_-18px_40px_-18px_rgba(0,0,0,0.65)]'
                : 'upup-bg-white/[0.85] upup-ring-black/[0.08] upup-shadow-[0_-18px_40px_-18px_rgba(15,23,42,0.25)]',
        ),
    )

    readonly gripBarClass = computed(() =>
        cn(
            'upup-h-1 upup-w-10 upup-rounded-full',
            this.store.isDark() ? 'upup-bg-white/20' : 'upup-bg-black/20',
        ),
    )

    frameStroke(): string {
        const dark = this.store.isDark()
        const dragging = this.absoluteIsDragging()
        if (dark)
            return dragging ? 'rgba(56,189,248,0.65)' : 'rgba(56,189,248,0.35)'
        return dragging ? 'rgba(2,132,199,0.7)' : 'rgba(2,132,199,0.4)'
    }

    builtByClass(): string {
        return cn(
            'upup-mr-0.5 upup-text-xs upup-leading-5 upup-text-[#6D6D6D] md:upup-text-sm',
            {
                'upup-text-gray-300 dark:upup-text-gray-300':
                    this.store.isDark(),
            },
        )
    }

    readonly uploadAnnouncement = computed(() => {
        const tr = this.store.translations()
        const status = this.store.uploadStatus()
        return status === UploadStatus.UPLOADING
            ? tr.announceUploadStarted
            : status === UploadStatus.SUCCESSFUL
              ? tr.announceUploadComplete
              : status === UploadStatus.FAILED
                ? tr.announceUploadFailed
                : ''
    })

    // ── Drag handlers ──────────────────────────────────────────────────────────
    handleDragOver(e: DragEvent): void {
        this.dragController.handleDragOver(e)
    }
    handleDragLeave(e: DragEvent): void {
        this.dragController.handleDragLeave(e)
    }
    handleDrop(e: DragEvent): Promise<void> {
        return this.dragController.handleDrop(e)
    }
    handlePaste(e: ClipboardEvent): void {
        this.dragController.handlePaste(e)
    }

    // ── Sheet overlay handlers ─────────────────────────────────────────────────
    onOverlayKeydown(e: KeyboardEvent): void {
        if (e.key === 'Escape' && !this.store.sourceOverlayClosing())
            this.store.closeSourceOverlay()
    }

    onGripClick(): void {
        if (!this.swiped) this.store.closeSourceOverlay()
        this.swiped = false
    }

    onGripPointerDown(e: PointerEvent): void {
        this.swipeStartY = e.clientY
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }

    onGripPointerMove(e: PointerEvent): void {
        const startY = this.swipeStartY
        const sheet = this.overlayRef?.nativeElement
        if (startY === null || !sheet) return
        const dy = Math.max(0, e.clientY - startY)
        sheet.style.transition = 'none'
        sheet.style.transform = `translateY(${dy}px)`
    }

    onGripPointerUp(e: PointerEvent): void {
        const startY = this.swipeStartY
        const sheet = this.overlayRef?.nativeElement
        this.swipeStartY = null
        if (startY === null || !sheet) return
        const dy = Math.max(0, e.clientY - startY)
        sheet.style.transition = ''
        sheet.style.transform = ''
        if (dy > 72) {
            this.swiped = true
            this.store.closeSourceOverlay()
        }
    }
}
