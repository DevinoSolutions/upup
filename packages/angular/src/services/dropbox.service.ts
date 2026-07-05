import { Injectable, inject, computed, type Signal } from '@angular/core'
import { DROPBOX_DESCRIPTOR, type DriveFile, type DriveFolder } from '@upup/core'
import { DriveBrowserController, type DriveBrowserState } from '@upup/core/internal'
import { UpupStore } from '../upup-store.service'
import { toSignalStore } from '../lib/to-signal-store'

/**
 * Angular port of useDropbox.ts (svelte composable).
 *
 * Pure delegation to DriveBrowserController with DROPBOX_DESCRIPTOR (popup auth).
 * No business logic lives here — everything flows through the controller.
 */
@Injectable()
export class DropboxService {
    private store = inject(UpupStore)

    private controller = new DriveBrowserController(
        this.store.core,
        DROPBOX_DESCRIPTOR,
        {
            onFilesSelected: files => {
                void this.store.handleSetSelectedFiles(files as File[])
            },
            onClose: () => {
                this.store.setActiveSource(undefined)
            },
        },
    )

    private signalStore = toSignalStore<DriveBrowserState>(this.controller)
    private state: Signal<DriveBrowserState> = this.signalStore.state

    // ── Selector signals ──────────────────────────────────────────
    readonly user = computed(() => this.state().user)
    readonly dropboxFiles = computed(() => this.state().folder)
    readonly token = computed(() =>
        this.state().isAuthenticated ? 'active' : undefined,
    )
    readonly isAuthenticated = computed(() => this.state().isAuthenticated)
    readonly isLoading = computed(() => this.state().isLoading)
    readonly path = computed(() => this.state().path)
    readonly selectedFiles = computed(() => this.state().selectedFiles)
    readonly showLoader = computed(() => this.state().showLoader)
    readonly isClickLoading = computed(() => this.state().isClickLoading)
    readonly error = computed(() => this.state().error)
    readonly hasMore = computed(() => this.state().hasMore)
    readonly isLoadingMore = computed(() => this.state().isLoadingMore)

    // ── Lifecycle ─────────────────────────────────────────────────
    init(): void {
        this.controller.init()
    }
    destroy(): void {
        this.signalStore.destroy()
        this.controller.destroy()
    }

    // ── Forwarding methods ────────────────────────────────────────
    authenticate(): void {
        this.controller.signIn()
    }
    logout(): void {
        this.controller.signOut()
    }
    setPath(newPath: DriveFolder[]): void {
        this.controller.setPath(newPath)
    }
    handleClick(file: DriveFile): void {
        this.controller.handleClick(file)
    }
    handleSignOut(): void {
        this.controller.signOut()
    }
    handleSubmit(): Promise<void> {
        return this.controller.handleSubmit()
    }
    handleCancelDownload(): void {
        this.controller.handleCancelDownload()
    }
    onSelectCurrentFolder(): void {
        this.controller.onSelectCurrentFolder()
    }
    loadMore(): Promise<void> {
        return this.controller.loadMore()
    }
}
