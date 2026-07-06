import { FileSource } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/uploader-context'
import { uploadSourceObject } from '../lib/constants'

type SourceOption = (typeof uploadSourceObject)[string] & { name: string }

export interface UseSourceSelectorReturn {
    chosenSources: SourceOption[]
    handleSourceClick: (sourceId: FileSource) => void
    handleInputFileChange: (e: Event) => void
}

export default function useSourceSelector(): UseSourceSelectorReturn {
    const { core, openFilePicker } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()
    const { translations } = useUploaderI18n()
    const { sources, onIntegrationClick } = useUploaderOptions()

    // translations and sources are plain (non-reactive) values in the Svelte context
    // (ContextI18n = BaseContextI18n; ContextProps fields are plain JS values).
    const chosenSources = Object.values(uploadSourceObject)
        .filter(item => sources.includes(item.id))
        .map(item => ({
            ...item,
            name: translations[item.nameKey],
        }))

    function handleSourceClick(sourceId: FileSource) {
        onIntegrationClick(sourceId)
        core?.emit('source-click', { sourceId })
        if (sourceId === FileSource.LOCAL) openFilePicker()
        else setActiveSource(sourceId)
    }

    function handleInputFileChange(e: Event) {
        const target = e.target as HTMLInputElement
        setFiles(Array.from(target.files || []))
        target.value = ''
    }

    return {
        chosenSources,
        handleSourceClick,
        handleInputFileChange,
    }
}
