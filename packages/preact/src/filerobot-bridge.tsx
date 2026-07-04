import { useEffect, useRef, useState } from 'react'
import { loadIsland } from './filerobot-island-loader'
import type { IslandHandle, IslandProps } from './filerobot-island-types'

// Static re-export: the chrome reads mod.TABS / mod.TOOLS synchronously off this
// module after `await import('react-filerobot-image-editor')` resolves here.
export { TABS, TOOLS } from './filerobot-constants'

/**
 * preact/compat bridge that the @upup/react chrome resolves to in place of
 * `react-filerobot-image-editor` (via the tsup esbuild alias). It renders a host
 * <div>, lazily loads the real-React island, and mounts the editor into it.
 *
 * Props mirror what the chrome passes to <EditorComponent> and are forwarded
 * verbatim to the island (no transformation — save logic stays in the chrome).
 */
export default function FilerobotBridge(props: IslandProps) {
    const hostRef = useRef<HTMLDivElement | null>(null)
    const handleRef = useRef<IslandHandle | null>(null)
    const propsRef = useRef<IslandProps>(props)
    propsRef.current = props

    const [ready, setReady] = useState(false)
    const [error, setError] = useState(false)

    // Mount the island once. The host div is always rendered so it exists here.
    useEffect(() => {
        let cancelled = false
        const host = hostRef.current
        if (!host) return
        loadIsland()
            .then(island => {
                if (cancelled) return
                handleRef.current = island.mount(host, propsRef.current)
                setReady(true)
            })
            .catch(() => {
                if (!cancelled) setError(true)
            })
        return () => {
            cancelled = true
            handleRef.current?.unmount()
            handleRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Forward later prop changes to the mounted island (no-op until mounted).
    useEffect(() => {
        handleRef.current?.update(props)
    }, [props])

    return (
        <div className="upup-relative upup-h-full upup-w-full">
            <div ref={hostRef} className="upup-h-full upup-w-full" />
            {!ready && !error && (
                <div className="upup-absolute upup-inset-0 upup-flex upup-items-center upup-justify-center">
                    <div className="upup-h-8 upup-w-8 upup-animate-spin upup-rounded-full upup-border-2 upup-border-t-transparent upup-border-gray-300" />
                </div>
            )}
            {error && (
                <div className="upup-absolute upup-inset-0 upup-flex upup-items-center upup-justify-center upup-p-8">
                    <p className="upup-text-center upup-text-sm upup-text-red-600">
                        Image editor failed to load.
                    </p>
                </div>
            )}
        </div>
    )
}
