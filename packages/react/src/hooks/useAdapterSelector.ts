'use client'
import { ChangeEventHandler, useCallback, useMemo } from 'react'
import { FileSource } from '@upup/core'
import { useRootContext } from '../context/RootContext'
import { uploadSourceObject } from '../lib/constants'

export default function useAdapterSelector() {
    const {
        core,
        inputRef,
        setActiveAdapter,
        setFiles,
        translations,
        props: { sources, onIntegrationClick },
    } = useRootContext()

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
