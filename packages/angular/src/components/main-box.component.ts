import {
    Component,
    OnDestroy,
    OnInit,
    computed,
    inject,
} from '@angular/core'
import { cn, DragDropController, type DragDropSnapshot } from '@upup/core'
import { UpupStore } from '../upup-store.service'
import { toSignalStore, type SignalStore } from '../lib/to-signal-store'
import { SourceViewComponent } from './source-view.component'
import { SourceSelectorComponent } from './source-selector.component'
import { FileListComponent } from './file-list.component'

/**
 * MainBoxComponent — Angular port of MainBox.svelte + useMainBox.ts composable.
 *
 * Renders the main dropzone area with:
 *   - Offline banner
 *   - SourceView (when an adapter is active)
 *   - SourceSelector (when no adapter + no files / adding more)
 *   - FileList (always)
 *
 * Drag/drop/paste/keydown logic 1:1 from useMainBox.ts.
 */
@Component({
    selector: 'upup-main-box',
    standalone: true,
    imports: [
        SourceViewComponent,
        SourceSelectorComponent,
        FileListComponent,
    ],
    template: `
        <div
            data-testid="upup-dropzone"
            data-upup-slot="main-box"
            role="button"
            tabindex="0"
            [attr.aria-label]="store.translations?.().dropzoneLabel"
            [attr.aria-dropeffect]="isDragging() ? 'copy' : 'none'"
            (keydown)="onKeyDown($event)"
            (dragover)="handleDragOver($event)"
            (dragleave)="handleDragLeave($event)"
            (drop)="handleDrop($event)"
            (paste)="handlePaste($event)"
            [class]="boxClass()"
        >
            @if (!store.isOnline?.()) {
                <div [class]="offlineBannerClass()">
                    No internet connection — uploads will resume when you reconnect.
                </div>
            }

            @if (!!store.activeAdapter?.()) {
                <upup-adapter-view />
            }

            @if (!store.activeAdapter?.() && (store.isAddingMore?.() || !store.files?.().size)) {
                <upup-adapter-selector />
            }

            <upup-file-list />
        </div>
    `,
})
export class MainBoxComponent implements OnInit, OnDestroy {
    readonly store = inject(UpupStore)

    // ── Dropzone controller (shared @upup/core) + its Angular-signal view ─────
    private dragController!: DragDropController
    private dragStore!: SignalStore<DragDropSnapshot>

    ngOnInit(): void {
        this.dragController = new DragDropController({
            core: this.store.core!,
            orchestrator: this.store.orchestrator!,
            setFiles: (files) => this.store.handleSetSelectedFiles(files),
            // The file list derives from the orchestrator snapshot — derive the
            // border's file count from the same source so it stays in lockstep.
            filesSize: () => this.store.orchestrator!.getSnapshot().files.size,
            options: () => this.store.uiProps,
            props: () => ({
                disableDragDrop: this.store.uiProps.disableDragDrop,
                isProcessing: this.store.uiProps.isProcessing,
                folderUploadAllowDrop: this.store.uiProps.folderUploadAllowDrop,
            }),
        })
        this.dragStore = toSignalStore(this.dragController)
        this.dragController.init()
    }

    // ── Drag-state signals (controller-backed; mirror the prior computeds) ────
    readonly isDragging = computed(() => this.dragStore?.state().isDragging ?? false)
    readonly absoluteIsDragging = computed(() => this.dragStore?.state().absoluteIsDragging ?? false)
    readonly absoluteHasBorder = computed(() => this.dragStore?.state().absoluteHasBorder ?? true)

    readonly boxClass = computed(() => {
        const hasBorder = this.absoluteHasBorder()
        const dragging = this.isDragging()
        const absDragging = this.absoluteIsDragging()
        const dark = this.store.isDark?.() ?? false

        return cn('upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg', {
            'upup-border upup-border-[#1849D6]': hasBorder,
            'upup-border-[#30C5F7] dark:upup-border-[#30C5F7]': hasBorder && dark,
            'upup-border-dashed': !dragging,
            'upup-bg-[#E7ECFC] upup-backdrop-blur-sm': absDragging && !dark,
            'upup-bg-[#045671] upup-backdrop-blur-sm dark:upup-bg-[#045671]': absDragging && dark,
        })
    })

    readonly offlineBannerClass = computed(() =>
        cn(
            'upup-absolute upup-inset-x-0 upup-top-0 upup-z-20 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
            { 'upup-bg-yellow-600': this.store.isDark?.() ?? false },
        ),
    )

    // ── Drag handlers — delegate to the shared @upup/core controller ──────────
    handleDragOver(e: DragEvent): void { this.dragController.handleDragOver(e) }
    handleDragLeave(e: DragEvent): void { this.dragController.handleDragLeave(e) }
    // Returns the promise so callers/tests can await the async folder-collect → setFiles flow.
    handleDrop(e: DragEvent): Promise<void> { return this.dragController.handleDrop(e) }
    handlePaste(e: ClipboardEvent): void { this.dragController.handlePaste(e) }

    // ── Keyboard handler ──────────────────────────────────────────────────────
    onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            const el = this.store.getFileInput()
            if (el) {
                el.removeAttribute('webkitdirectory')
                el.removeAttribute('directory')
            }
            this.store.openFilePicker()
        }
    }

    ngOnDestroy(): void {
        this.dragController?.dispose()
        this.dragStore?.dispose()
    }
}
