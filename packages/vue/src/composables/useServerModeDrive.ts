import { computed, shallowRef, onMounted, onUnmounted } from 'vue'
import { ServerModeDriveController } from '@upup/core'
import type { ServerModeProvider, ServerDriveFile } from '@upup/core'
import { useUploaderRuntime } from '../context/uploader-context'

export type { ServerModeProvider, ServerDriveFile }

export function useServerModeDrive(provider: ServerModeProvider) {
    const { serverUrl } = useUploaderRuntime()
    const controller = new ServerModeDriveController({ provider, serverUrl: () => serverUrl })

    const snap = shallowRef(controller.getSnapshot())
    let unsub: (() => void) | null = null
    onMounted(() => {
        unsub = controller.subscribe(() => { snap.value = controller.getSnapshot() })
        controller.init()
    })
    onUnmounted(() => { controller.dispose(); unsub?.() })

    return {
        state: computed(() => snap.value.state),
        folderId: computed(() => snap.value.folderId),
        setFolderId(id: string | undefined) { controller.setFolderId(id); void controller.refresh() },
        search: computed(() => snap.value.search),
        setSearch(s: string) { controller.setSearch(s); void controller.refresh() },
        refresh: controller.refresh,
        transfer: controller.transfer,
        startAuth: controller.startAuth,
    }
}
