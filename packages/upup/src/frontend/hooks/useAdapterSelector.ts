import { ChangeEventHandler, useCallback, useMemo } from 'react'
import { UploadAdapter } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'

export default function useAdapterSelector() {
    const {
        inputRef,
        setActiveAdapter,
        setFiles,
        translations,
        props: { uploadAdapters, onIntegrationClick },
    } = useRootContext()

    const chosenAdapters = useMemo(
        () =>
            Object.values(uploadAdapterObject)
                .filter(item => uploadAdapters.includes(item.id))
                .map(item => ({
                    ...item,
                    name: translations[item.nameKey],
                })),
        [uploadAdapters, translations],
    )

    const handleAdapterClick = useCallback(
        (adapterId: UploadAdapter) => {
            onIntegrationClick(adapterId)
            if (adapterId === UploadAdapter.INTERNAL) inputRef.current?.click()
            else setActiveAdapter(adapterId)
        },
        [inputRef, onIntegrationClick, setActiveAdapter],
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
        chosenAdapters,
        handleAdapterClick,
        handleInputFileChange,
    }
}
