import { Injectable, inject, signal, computed } from '@angular/core'
import {
    type ServerModeProvider,
    type ServerDriveFile,
    type ServerDriveListState,
} from '@useupup/core'
import { ServerModeDriveController } from '@useupup/core/internal'
import { UpupStore } from '../upup-store.service'
import { toSignalStore, type SignalStore } from '../lib/to-signal-store'

// Preserve the module's existing public type surface for consumers that import from here.
export type { ServerModeProvider, ServerDriveFile }
export type ListState = ServerDriveListState

export const PROVIDER_LABEL: Record<ServerModeProvider, string> = {
    'google-drive': 'Google Drive',
    'one-drive': 'OneDrive',
    dropbox: 'Dropbox',
    box: 'Box',
}

@Injectable()
export class ServerModeDriveService {
    private store = inject(UpupStore)
    private controller!: ServerModeDriveController
    private bridge!: SignalStore<
        import('@useupup/core/internal').ServerDriveSnapshot
    >
    private provider!: ServerModeProvider

    // ── Drive list state — mirrored from the controller snapshot ──
    readonly listState = computed<ServerDriveListState>(
        () => this.bridge?.state().state ?? { status: 'idle' },
    )
    readonly folderId = computed(() => this.bridge?.state().folderId)
    readonly search = computed(() => this.bridge?.state().search ?? '')

    // ── Selection + transfer UI state — Angular-only (consumer concern) ──
    readonly selected = signal<Set<string>>(new Set())
    readonly isTransferring = signal<boolean>(false)
    // A failed transfer stays in the view: its message shows in the drive-error
    // slot (like a list error) and the file list is kept for a retry.
    readonly transferError = signal<{
        message: string
        code?: string | undefined
    } | null>(null)

    init(provider: ServerModeProvider): void {
        this.provider = provider
        this.controller = new ServerModeDriveController({
            provider,
            serverUrl: () => this.store.serverUrl,
            core: () => this.store.core,
        })
        this.bridge = toSignalStore(this.controller)
        this.controller.init()
    }

    list(opts?: { folderId?: string; search?: string }): Promise<void> {
        this.transferError.set(null)
        return this.controller.list(opts)
    }
    startAuth(): void {
        this.controller.startAuth()
    }
    signOut(): Promise<boolean> {
        return this.controller.signOut()
    }
    setFolderId(id: string | undefined): void {
        this.controller.setFolderId(id)
    }
    setSearch(s: string): void {
        this.controller.setSearch(s)
    }

    toggleSelected(id: string): void {
        const next = new Set(this.selected())
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        this.selected.set(next)
    }

    /** Resolves true when every selected file transferred (the caller leaves the view). */
    async transfer(): Promise<boolean> {
        const state = this.listState()
        if (state.status !== 'ready') return false
        const toTransfer = state.files.filter(f => this.selected().has(f.id))
        if (!toTransfer.length) return false

        this.isTransferring.set(true)
        this.transferError.set(null)
        try {
            for (const file of toTransfer) {
                const r = await this.controller.transfer(file)
                if (r.status === 'reauth') {
                    this.controller.requestReauth()
                    return false
                }
                if (r.status === 'error') {
                    this.transferError.set(r)
                    return false
                }
                const result = r.result as { file?: File }
                if (result.file) {
                    void this.store.handleSetSelectedFiles([result.file])
                }
                this.toggleSelected(file.id)
            }
            return true
        } finally {
            this.isTransferring.set(false)
        }
    }

    destroy(): void {
        this.controller?.destroy()
        this.bridge?.destroy()
    }

    get providerLabel(): string {
        return PROVIDER_LABEL[this.provider]
    }
}
