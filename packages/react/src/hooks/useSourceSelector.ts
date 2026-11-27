import { ChangeEventHandler, useCallback, useEffect, useMemo } from 'react'
import { FileSource } from '@useupup/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/UploaderContext'
import {
    IDLE_PRELOAD_SOURCES,
    preloadSource,
    uploadSourceObject,
} from '../lib/constants'

type ChosenSource =
    (typeof uploadSourceObject)[keyof typeof uploadSourceObject] & {
        name: string
    }

export default function useSourceSelector(): {
    chosenSources: ChosenSource[]
    handleSourceClick: (sourceId: FileSource) => void
    /** Pointer/focus on a tile: start fetching that source's view chunk. */
    handleSourceIntent: (sourceId: FileSource) => void
    handleInputFileChange: ChangeEventHandler<HTMLInputElement>
} {
    const { core, openFilePicker } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()
    const { translations } = useUploaderI18n()
    const { sources, onIntegrationClick, mini } = useUploaderOptions()

    const chosenSources = useMemo(
        () =>
            Object.values(uploadSourceObject)
                .filter(item => sources.includes(item.id))
                .map(item => ({
                    ...item,
                    name: translations[item.nameKey],
                })),
        [sources, translations],
    )

    // Warm the popup-drive chunks once the selector is on screen, after first
    // paint, so the first tile click mounts the view without suspending and its
    // sign-in popup opens inside the click. Only configured sources are fetched.
    useEffect(() => {
        if (mini) return
        const wanted = chosenSources
            .map(item => item.id)
            .filter(id => IDLE_PRELOAD_SOURCES.includes(id))
        if (wanted.length === 0) return
        const run = () => {
            wanted.forEach(preloadSource)
        }
        if (typeof window.requestIdleCallback === 'function') {
            const handle = window.requestIdleCallback(run, { timeout: 2000 })
            return () => {
                window.cancelIdleCallback(handle)
            }
        }
        const handle = window.setTimeout(run, 1)
        return () => {
            window.clearTimeout(handle)
        }
    }, [chosenSources, mini])

    const handleSourceIntent = useCallback((sourceId: FileSource) => {
        preloadSource(sourceId)
    }, [])

    const handleSourceClick = useCallback(
        (sourceId: FileSource) => {
            onIntegrationClick(sourceId)
            core?.emit('source-click', { sourceId })
            if (sourceId === FileSource.LOCAL) openFilePicker()
            else setActiveSource(sourceId)
        },
        [core, openFilePicker, onIntegrationClick, setActiveSource],
    )

    const handleInputFileChange: ChangeEventHandler<HTMLInputElement> =
        useCallback(
            e => {
                setFiles(Array.from(e.currentTarget.files || []))
                e.currentTarget.value = ''
            },
            [setFiles],
        )

    return {
        chosenSources,
        handleSourceClick,
        handleSourceIntent,
        handleInputFileChange,
    }
}
