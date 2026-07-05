import { Injectable, inject, signal, computed } from '@angular/core'
import {
    type ServerModeProvider,
    type ServerDriveFile,
    type ServerDriveListState,
} from '@upup/core'
import { ServerModeDriveController } from '@upup/core/internal'
import { UpupStore } from '../upup-store.service'
import { toSignalStore, type SignalStore } from '../lib/to-signal-store'

// Preserve the module's existing public type surface for consumers that import from here.
export type { ServerModeProvider, ServerDriveFile }
export type ListState = ServerDriveListState

export const PROVIDER_LABEL: Record<ServerModeProvider, string> = {
    'google-drive': 'Google Drive',
    onedrive: 'OneDrive',
    dropbox: 'Dropbox',
    box: 'Box',
}

@Injectable()
export class ServerModeDriveService {
    private store = inject(UpupStore)
    private controller!: ServerModeDriveController
    private bridge!: SignalStore<
        import('@upup/core/internal').ServerDriveSnapshot
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

    init(provider: ServerModeProvider): void {
        this.provider = provider
        this.controller = new ServerModeDriveController({
            provider,
            serverUrl: () => this.store.serverUrl,
        })
        this.bridge = toSignalStore(this.controller)
        this.controller.init()
    }

    list(opts?: { folderId?: string; search?: string }): Promise<void> {
        return this.controller.list(opts)
    }
    startAuth(): void {
        this.controller.startAuth()
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

    async transfer(): Promise<void> {
        const state = this.listState()
        if (state.status !== 'ready') return
        const toTransfer = state.files.filter(f => this.selected().has(f.id))
        if (!toTransfer.length) return

        this.isTransferring.set(true)
        try {
            for (const file of toTransfer) {
                const r = await this.controller.transfer(file)
                if (r.status === 'reauth') {
                    this.controller.requestReauth()
                    return
                }
                if (r.status === 'error') {
                    this.controller.setError(r.message)
                    return
                }
                const result = r.result as { file?: File }
                if (result?.file) {
                    void this.store.handleSetSelectedFiles([result.file])
                }
            }
            this.selected.set(new Set())
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
