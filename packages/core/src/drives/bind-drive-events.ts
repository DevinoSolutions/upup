import type { UpupCore } from '../core'

export interface DriveEventCallbacks {
    onAuthenticated: (payload: unknown) => void
    onSignedOut: () => void
    onSessionExpired: () => void
    onFilesLoaded: (payload: unknown) => void
    onStateChange: (payload: unknown) => void
    onError: (payload?: unknown) => void
}

export function bindDriveEvents(
    core: UpupCore,
    provider: string,
    callbacks: DriveEventCallbacks,
): () => void {
    const unsubs = [
        core.on(`${provider}:authenticated`, callbacks.onAuthenticated),
        core.on(`${provider}:signed-out`, callbacks.onSignedOut),
        core.on(`${provider}:session-expired`, callbacks.onSessionExpired),
        core.on(`${provider}:files-loaded`, callbacks.onFilesLoaded),
        core.on(`${provider}:state-change`, callbacks.onStateChange),
        core.on(`${provider}:error`, callbacks.onError),
    ]
    return () => {
        unsubs.forEach(u => {
            u()
        })
    }
}
