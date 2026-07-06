import { ChangeEventHandler, useCallback, useMemo } from 'react'
import { FileSource } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/UploaderContext'
import { uploadSourceObject } from '../lib/constants'

type ChosenSource =
    (typeof uploadSourceObject)[keyof typeof uploadSourceObject] & {
        name: string
    }

export default function useSourceSelector(): {
    chosenSources: ChosenSource[]
    handleSourceClick: (sourceId: FileSource) => void
    handleInputFileChange: ChangeEventHandler<HTMLInputElement>
} {
    const { core, openFilePicker } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
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
        handleInputFileChange,
    }
}
