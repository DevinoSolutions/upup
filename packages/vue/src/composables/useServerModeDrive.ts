import {
    computed,
    shallowRef,
    onMounted,
    onUnmounted,
    type ComputedRef,
} from 'vue'
import { ServerModeDriveController } from '@upupjs/core/internal'
import type { ServerModeProvider, ServerDriveFile } from '@upupjs/core'
import { useUploaderRuntime } from '../context/uploader-context'

export type { ServerModeProvider, ServerDriveFile }

type ServerDriveSnapshot = ReturnType<ServerModeDriveController['getSnapshot']>

interface UseServerModeDriveReturn {
    state: ComputedRef<ServerDriveSnapshot['state']>
    folderId: ComputedRef<ServerDriveSnapshot['folderId']>
    setFolderId: (id: string | undefined) => void
    search: ComputedRef<ServerDriveSnapshot['search']>
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

    const snap = shallowRef(controller.getSnapshot())
    let unsub: (() => void) | null = null
    onMounted(() => {
        unsub = controller.subscribe(() => {
            snap.value = controller.getSnapshot()
        })
        controller.init()
    })
    onUnmounted(() => {
        controller.destroy()
        unsub?.()
    })

    return {
        state: computed(() => snap.value.state),
        folderId: computed(() => snap.value.folderId),
        setFolderId(id: string | undefined) {
            controller.setFolderId(id)
            void controller.refresh()
        },
        search: computed(() => snap.value.search),
        setSearch(s: string) {
            controller.setSearch(s)
            void controller.refresh()
        },
        refresh: opts => controller.refresh(opts),
        transfer: file => controller.transfer(file),
        startAuth: () => {
            controller.startAuth()
        },
    }
}
