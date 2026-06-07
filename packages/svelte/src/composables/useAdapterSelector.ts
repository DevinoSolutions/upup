import { FileSource } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/root-context'
import { uploadSourceObject } from '../lib/constants'

export default function useAdapterSelector() {
    const { core, openFilePicker } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()
    const { translations } = useUploaderI18n()
    const { sources, onIntegrationClick } = useUploaderOptions()

    // translations and sources are plain (non-reactive) values in the Svelte context
    // (ContextI18n = BaseContextI18n; ContextProps fields are plain JS values).
    const chosenSources = Object.values(uploadSourceObject)
        .filter((item) => sources.includes(item.id))
        .map((item) => ({
            ...item,
            name: translations[item.nameKey],
        }))

    function handleAdapterClick(sourceId: FileSource) {
        onIntegrationClick(sourceId)
        core?.emit('source-click', { sourceId })
        if (sourceId === FileSource.LOCAL) openFilePicker()
        else setActiveAdapter(sourceId)
    }

    function handleInputFileChange(e: Event) {
        const target = e.target as HTMLInputElement
        setFiles(Array.from(target.files || []))
        target.value = ''
    }

    return {
        chosenSources,
        handleAdapterClick,
        handleInputFileChange,
    }
}
