import { Injectable, inject, computed, type Signal } from '@angular/core'
import {
    GOOGLE_DRIVE_DESCRIPTOR,
    type DriveFile,
    type DriveFolder,
} from '@useupup/core'
import {
    DriveBrowserController,
    type DriveBrowserState,
} from '@useupup/core/internal'
import { UpupStore } from '../upup-store.service'
import { toSignalStore } from '../lib/to-signal-store'

/**
 * Angular port of useGoogleDrive.ts (svelte composable).
 *
 * Creates and manages one DriveBrowserController for Google Drive (GIS auth).
 * ALL business logic lives in the controller — this service only:
 *   1. Constructs the controller with the store's core + callbacks
 *   2. Bridges the controller's subscribe/getSnapshot to Angular signals via toSignalStore
 *   3. Exposes typed selectors + forwarding methods (pure delegation, no logic)
 *
 * Call init() from ngOnInit and destroy() from ngOnDestroy (or via DestroyRef).
 */
@Injectable()
export class GoogleDriveService {
    private store = inject(UpupStore)

    private controller = new DriveBrowserController(
        this.store.core,
        GOOGLE_DRIVE_DESCRIPTOR,
        {
            onFilesSelected: files => {
                void this.store.handleSetSelectedFiles(files)
            },
            onClose: () => {
                this.store.setActiveSource(undefined)
            },
        },
    )

    private signalStore = toSignalStore<DriveBrowserState>(this.controller)
    private state: Signal<DriveBrowserState> = this.signalStore.state

    // ── Selector signals (pure computed from snapshot) ──────────
    readonly user = computed(() => this.state().user)
    readonly googleFiles = computed(() => this.state().folder)
    readonly token = computed(() => this.state().token)
    readonly authCancelled = computed(() => this.state().authCancelled)
    readonly isAuthReady = computed(() => this.state().isAuthReady)
    readonly path = computed(() => this.state().path)
    readonly selectedFiles = computed(() => this.state().selectedFiles)
    readonly showLoader = computed(() => this.state().showLoader)
    readonly isClickLoading = computed(() => this.state().isClickLoading)
    readonly error = computed(() => this.state().error)
    readonly hasMore = computed(() => this.state().hasMore)
    readonly isLoadingMore = computed(() => this.state().isLoadingMore)

    // ── Lifecycle (caller's responsibility) ──────────────────────
    init(): void {
        this.controller.init()
    }
    destroy(): void {
        this.signalStore.destroy()
        this.controller.destroy()
    }

    // ── Forwarding methods (pure delegation) ─────────────────────
    retryAuth(): void {
        this.controller.retryAuth()
    }
    handleSignOut(): void {
        this.controller.signOut()
    }
    setPath(newPath: DriveFolder[]): void {
        this.controller.setPath(newPath)
    }
    handleClick(file: DriveFile): void {
        this.controller.handleClick(file)
    }
    handleSubmit(): Promise<void> {
        return this.controller.handleSubmit()
    }
    handleCancelDownload(): void {
        this.controller.handleCancelDownload()
    }
    onSelectCurrentFolder(): void {
        void this.controller.onSelectCurrentFolder()
    }
    loadMore(): Promise<void> {
        return this.controller.loadMore()
    }
}
