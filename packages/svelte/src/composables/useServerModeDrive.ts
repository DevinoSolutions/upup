import { onMount, onDestroy } from 'svelte'
import { derived } from 'svelte/store'
import { ServerModeDriveController } from '@upup/core'
import type { ServerModeProvider, ServerDriveFile } from '@upup/core'
import { useUploaderRuntime } from '../context/root-context'
import { toReadable } from '../lib/to-readable'

export type { ServerModeProvider, ServerDriveFile }

export function useServerModeDrive(provider: ServerModeProvider) {
    const { serverUrl } = useUploaderRuntime()
    const controller = new ServerModeDriveController({ provider, serverUrl: () => serverUrl })

    const state = toReadable(controller)
    onMount(() => controller.init())
    onDestroy(() => controller.dispose())

    return {
        state: derived(state, ($s) => $s.state),
        folderId: derived(state, ($s) => $s.folderId),
        setFolderId(id: string | undefined) { controller.setFolderId(id) },   // svelte: NO auto-relist (matches today)
        search: derived(state, ($s) => $s.search),
        setSearch(s: string) { controller.setSearch(s) },                     // svelte: NO auto-relist
        refresh: controller.refresh,
        transfer: controller.transfer,
        startAuth: controller.startAuth,
    }
}
