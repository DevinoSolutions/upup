import { onMount, onDestroy } from 'svelte'
import { derived, type Readable } from 'svelte/store'
import { ServerModeDriveController } from '@useupup/core/internal'
import type { ServerModeProvider, ServerDriveFile } from '@useupup/core'
import { useUploaderRuntime } from '../context/uploader-context'
import { toReadable } from '../lib/to-readable'

export type { ServerModeProvider, ServerDriveFile }

type ServerDriveSnapshot = ReturnType<ServerModeDriveController['getSnapshot']>

export interface UseServerModeDriveReturn {
    state: Readable<ServerDriveSnapshot['state']>
    folderId: Readable<ServerDriveSnapshot['folderId']>
    setFolderId: (id: string | undefined) => void
    search: Readable<ServerDriveSnapshot['search']>
    setSearch: (s: string) => void
    refresh: ServerModeDriveController['refresh']
    transfer: ServerModeDriveController['transfer']
    startAuth: ServerModeDriveController['startAuth']
}

export function useServerModeDrive(
    provider: ServerModeProvider,
): UseServerModeDriveReturn {
    const { serverUrl } = useUploaderRuntime()
    const controller = new ServerModeDriveController({
        provider,
        serverUrl: () => serverUrl,
    })

    const state = toReadable(controller)
    onMount(() => {
        controller.init()
    })
    onDestroy(() => {
        controller.destroy()
    })

    return {
        state: derived(state, $s => $s.state),
        folderId: derived(state, $s => $s.folderId),
        setFolderId(id: string | undefined) {
            controller.setFolderId(id)
        }, // svelte: NO auto-relist (matches today)
        search: derived(state, $s => $s.search),
        setSearch(s: string) {
            controller.setSearch(s)
        }, // svelte: NO auto-relist
        refresh: controller.refresh.bind(controller),
        transfer: controller.transfer.bind(controller),
        startAuth: controller.startAuth.bind(controller),
    }
}
