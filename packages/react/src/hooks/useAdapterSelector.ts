import { ChangeEventHandler, useCallback, useMemo } from 'react'
import { FileSource } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/RootContext'
import { uploadSourceObject } from '../lib/constants'

export default function useAdapterSelector() {
    const { core, inputRef } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()
    const { translations } = useUploaderI18n()
    const { sources, onIntegrationClick } = useUploaderOptions()

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

    const handleAdapterClick = useCallback(
        (sourceId: FileSource) => {
            onIntegrationClick(sourceId)
            core?.emit('source-click', { sourceId })
            if (sourceId === FileSource.LOCAL) inputRef.current?.click()
            else setActiveAdapter(sourceId)
        },
        [core, inputRef, onIntegrationClick, setActiveAdapter],
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
        handleAdapterClick,
        handleInputFileChange,
    }
}
