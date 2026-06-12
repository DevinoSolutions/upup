import {
    Component,
    OnDestroy,
    computed,
    inject,
    signal,
} from '@angular/core'
import { cn, collectDroppedFiles, isUploadActive } from '@upup/core'
import { UpupStore } from '../upup-store.service'
import { AdapterViewComponent } from './adapter-view.component'
import { AdapterSelectorComponent } from './adapter-selector.component'
import { FileListComponent } from './file-list.component'
import { MainBoxHeaderComponent } from './main-box-header.component'

/**
 * MainBoxComponent — Angular port of MainBox.svelte + useMainBox.ts composable.
 *
 * Renders the main dropzone area with:
 *   - Offline banner
 *   - AdapterView (when an adapter is active)
 *   - AdapterSelector (when no adapter + no files / adding more)
 *   - FileList (always)
 *
 * Drag/drop/paste/keydown logic 1:1 from useMainBox.ts.
 */
@Component({
    selector: 'upup-main-box',
    standalone: true,
    imports: [
        AdapterViewComponent,
        AdapterSelectorComponent,
        FileListComponent,
        MainBoxHeaderComponent,
    ],
    template: `
        <upup-main-box-header [handleCancel]="handleCancel" />

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
export class MainBoxComponent implements OnDestroy {
    readonly store = inject(UpupStore)

    // ── Dragging state ────────────────────────────────────────────────────────
    readonly isDragging = signal(false)

    // ── Computed class signals (mirrors useMainBox.ts formulas) ──────────────
    readonly absoluteIsDragging = computed(
        () => this.isDragging() && !this.store.activeAdapter?.(),
    )

    readonly absoluteHasBorder = computed(
        () =>
            (!(this.store.files?.().size ?? 0) || this.store.isAddingMore?.() || this.isDragging()) &&
            !this.store.activeAdapter?.(),
    )

    readonly disableDragAction = computed(
        () =>
            !!(this.store.uiProps?.disableDragDrop) ||
            !!this.store.activeAdapter?.() ||
            isUploadActive(this.store.uploadStatus?.()),
    )

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

    // ── handleCancel (passed to MainBoxHeader as @Input) ─────────────────────
    readonly handleCancel = () => this.store.handleCancel()

    // ── Drag handlers (1:1 port of useMainBox.ts) ────────────────────────────
    handleDragOver(e: DragEvent): void {
        if (this.disableDragAction() || this.store.uiProps.isProcessing) return
        e.preventDefault()

        this.isDragging.set(true)
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'

        const droppedFiles = Array.from(e.dataTransfer?.files ?? [])
        this.store.uiProps.onFilesDragOver(droppedFiles)
        this.store.core?.emit('drag-over', {})
    }

    handleDragLeave(e: DragEvent): void {
        if (this.disableDragAction() || this.store.uiProps.isProcessing) return
        e.preventDefault()

        this.isDragging.set(false)

        const droppedFiles = Array.from(e.dataTransfer?.files ?? [])
        this.store.uiProps.onFilesDragLeave(droppedFiles)
        this.store.core?.emit('drag-leave', {})
    }

    async handleDrop(e: DragEvent): Promise<void> {
        if (this.disableDragAction() || this.store.uiProps.isProcessing) return
        e.preventDefault()

        if (!e.dataTransfer) {
            this.isDragging.set(false)
            return
        }

        const { files: droppedFiles, skippedDirectory } = await collectDroppedFiles(
            e.dataTransfer,
            this.store.uiProps.folderUploadAllowDrop,
        )

        if (skippedDirectory) {
            this.store.uiProps.onWarn(
                droppedFiles.length > 0
                    ? 'Dropped folders were ignored because folderUpload.allowDrop is disabled.'
                    : 'Folder drop is disabled. Enable folderUpload.allowDrop to accept dropped folders.',
            )
            this.store.core?.emit('folder-drop-blocked', { acceptedFiles: droppedFiles.length })
            if (droppedFiles.length === 0) {
                this.isDragging.set(false)
                return
            }
        }

        this.store.uiProps.onFilesDrop(droppedFiles)
        void this.store.handleSetSelectedFiles(droppedFiles)
        this.store.core?.emit('drop', { files: droppedFiles })

        this.isDragging.set(false)
    }

    handlePaste(e: ClipboardEvent): void {
        if (!this.store.uiProps.enablePaste || this.store.uiProps.isProcessing) return

        const items = Array.from(e.clipboardData?.items ?? [])
        const pastedFiles: File[] = []
        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile()
                if (file) {
                    const name =
                        file.name === 'image.png' || !file.name
                            ? `pasted-${Date.now()}.${file.type.split('/')[1] || 'png'}`
                            : file.name
                    const renamed = new File([file], name, { type: file.type })
                    pastedFiles.push(renamed)
                }
            }
        }

        if (pastedFiles.length > 0) {
            e.preventDefault()
            void this.store.handleSetSelectedFiles(pastedFiles)
            this.store.core?.emit('paste', { files: pastedFiles })
        }
    }

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
        // No subscriptions to clean up — all state is signals/computeds.
    }
}
