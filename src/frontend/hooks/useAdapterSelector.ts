import { ChangeEventHandler } from 'react'
import { UploadAdapter } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'

export default function useAdapterSelector() {
    const {
        inputRef,
        setActiveAdapter,
        setFiles,
        props: {
            accept,
            multiple,
            onIntegrationClick,
            uploadAdapters,
            mini,
            maxFileSize,
            onFileDragLeave,
            onFileDragOver,
            onFileDrop,
            limit,
        },
        isAddingMore,
        setIsAddingMore,
    } = useRootContext()
    const chosenAdapters = Object.values(uploadAdapterObject).filter(item =>
        uploadAdapters.includes(item.id),
    )
    const handleAdapterClick = (adapterId: UploadAdapter) => {
        onIntegrationClick(adapterId)

        if (adapterId === UploadAdapter.INTERNAL) inputRef.current?.click()
        else setActiveAdapter(adapterId)
    }

    const handleInputFileChange: ChangeEventHandler<HTMLInputElement> = e => {
        setFiles(Array.from(e.currentTarget.files || []))
        e.currentTarget.value = ''
    }

    return {
        onFileDragOver,
        onFileDragLeave,
        onFileDrop,
        setFiles,
        isAddingMore,
        setIsAddingMore,
        mini,
        chosenAdapters,
        handleAdapterClick,
        accept,
        inputRef,
        multiple,
        handleInputFileChange,
        limit,
        maxFileSize,
    }
}
