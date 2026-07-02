import { computed } from 'vue'
import { FileSource } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/uploader-context'
import { uploadSourceObject } from '../lib/constants'

export default function useSourceSelector() {
    const { core, openFilePicker } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()
    const { translations } = useUploaderI18n()
    const { sources, onIntegrationClick } = useUploaderOptions()

    const chosenSources = computed(() =>
        Object.values(uploadSourceObject)
            .filter(item => sources.includes(item.id))
            .map(item => ({
                ...item,
                name: translations[item.nameKey],
            })),
    )

    function handleAdapterClick(sourceId: FileSource) {
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
        handleAdapterClick,
        handleInputFileChange,
    }
}
