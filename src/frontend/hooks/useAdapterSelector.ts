import { ChangeEventHandler } from 'react'
import { UploadAdapter } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'

export default function useAdapterSelector() {
    const {
        inputRef,
        setActiveAdapter,
        setFiles,
        props,
        isAddingMore,
        setIsAddingMore,
    } = useRootContext()
    const chosenAdapters = Object.values(uploadAdapterObject).filter(item =>
        props.uploadAdapters.includes(item.id),
    )
    const handleAdapterClick = (adapterId: UploadAdapter) => {
        props.onIntegrationClick(adapterId)

        if (adapterId === UploadAdapter.INTERNAL) inputRef.current?.click()
        else setActiveAdapter(adapterId)
    }

    const handleInputFileChange: ChangeEventHandler<HTMLInputElement> = e => {
        setFiles(Array.from(e.currentTarget.files || []))
        e.currentTarget.value = ''
    }

    return {
        setFiles,
        isAddingMore,
        setIsAddingMore,
        chosenAdapters,
        handleAdapterClick,
        inputRef,
        handleInputFileChange,
        props,
    }
}
