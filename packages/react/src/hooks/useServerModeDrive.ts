import { useEffect, useRef, useSyncExternalStore } from 'react'
import { ServerModeDriveController } from '@upup/core'
import type { ServerModeProvider, ServerDriveFile } from '@upup/core'
import { useUploaderRuntime } from '../context/UploaderContext'

// Re-export so existing consumers that imported these from this module keep working.
export type { ServerModeProvider, ServerDriveFile }

export function useServerModeDrive(provider: ServerModeProvider) {
    const { serverUrl } = useUploaderRuntime()
    const latest = useRef({ serverUrl })
    latest.current = { serverUrl }

    const controllerRef = useRef<ServerModeDriveController | undefined>(
        undefined,
    )
    if (!controllerRef.current) {
        controllerRef.current = new ServerModeDriveController({
            provider,
            serverUrl: () => latest.current.serverUrl,
        })
    }
    const controller = controllerRef.current

    const snap = useSyncExternalStore(
        controller.subscribe,
        controller.getSnapshot,
    )

    useEffect(() => {
        controller.init()
        return () => controller.destroy()
    }, [controller])

    return {
        state: snap.state,
        folderId: snap.folderId,
        setFolderId: (id: string | undefined) => {
            controller.setFolderId(id)
            void controller.refresh()
        },
        search: snap.search,
        setSearch: (s: string) => {
            controller.setSearch(s)
            void controller.refresh()
        },
        refresh: controller.refresh,
        transfer: controller.transfer,
        startAuth: controller.startAuth,
    }
}
