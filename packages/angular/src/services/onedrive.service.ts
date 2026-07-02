import { Injectable, inject, computed, type Signal } from '@angular/core'
import {
    DriveBrowserController,
    ONE_DRIVE_DESCRIPTOR,
    type DriveBrowserState,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
import { UpupStore } from '../upup-store.service'
import { toSignalStore } from '../lib/to-signal-store'

/**
 * Angular port of useOneDrive.ts (svelte composable).
 *
 * Pure delegation to DriveBrowserController with ONE_DRIVE_DESCRIPTOR (popup auth).
 * No business logic lives here — everything flows through the controller.
 */
@Injectable()
export class OneDriveService {
    private store = inject(UpupStore)

    private controller = new DriveBrowserController(
        this.store.core,
        ONE_DRIVE_DESCRIPTOR,
        {
            onFilesSelected: (files) => { void this.store.handleSetSelectedFiles(files as File[]) },
            onClose: () => { this.store.setActiveSource(undefined) },
        },
    )

    private signalStore = toSignalStore<DriveBrowserState>(this.controller)
    private state: Signal<DriveBrowserState> = this.signalStore.state

    // ── Selector signals ──────────────────────────────────────────
    readonly user = computed(() => this.state().user)
    readonly oneDriveFiles = computed(() => this.state().folder)
    readonly token = computed(() => this.state().isAuthenticated ? 'active' : undefined)
    readonly isAuthenticated = computed(() => this.state().isAuthenticated)
    readonly isLoading = computed(() => this.state().isLoading)
    readonly path = computed(() => this.state().path)
    readonly selectedFiles = computed(() => this.state().selectedFiles)
    readonly showLoader = computed(() => this.state().showLoader)
    readonly downloadProgress = computed(() => this.state().downloadProgress)
    readonly isClickLoading = computed(() => this.state().isClickLoading)

    // ── Lifecycle ─────────────────────────────────────────────────
    init(): void { this.controller.init() }
    destroy(): void {
        this.signalStore.destroy()
        this.controller.destroy()
    }

    // ── Forwarding methods ────────────────────────────────────────
    signIn(): void { this.controller.signIn() }
    signOut(): void { this.controller.signOut() }
    setPath(newPath: DriveFolder[]): void { this.controller.setPath(newPath) }
    handleClick(file: DriveFile): void { this.controller.handleClick(file) }
    handleSubmit(): Promise<void> { return this.controller.handleSubmit() }
    handleCancelDownload(): void { this.controller.handleCancelDownload() }
    onSelectCurrentFolder(): void { this.controller.onSelectCurrentFolder() }
}
