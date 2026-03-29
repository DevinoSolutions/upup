'use client'

import { ChangeEventHandler, useCallback, useMemo, useRef } from 'react'
import { FileSource } from '@upup/shared'
import { useUploaderContext } from '../context/uploader-context'
import { uploadAdapterObject } from '../lib/constants'

export default function useAdapterSelector() {
    const {
        setActiveSource,
        addFiles,
        sources,
    } = useUploaderContext()

    // inputRef is not yet in UploaderContextValue — maintain a local ref as fallback
    const localInputRef = useRef<HTMLInputElement | null>(null)

    const chosenAdapters = useMemo(
        () =>
            Object.values(uploadAdapterObject).filter(item =>
                sources.includes(item.id as any),
            ),
        [sources],
    )

    const handleAdapterClick = useCallback(
        (adapterId: FileSource) => {
            if (adapterId === FileSource.LOCAL) {
                localInputRef.current?.click()
            } else {
                setActiveSource(adapterId)
            }
        },
        [setActiveSource],
    )

    const handleInputFileChange: ChangeEventHandler<HTMLInputElement> =
        useCallback(
            e => {
                addFiles(Array.from(e.currentTarget.files || []))
                e.currentTarget.value = ''
            },
            [addFiles],
        )

    return {
        chosenAdapters,
        handleAdapterClick,
        handleInputFileChange,
        localInputRef,
    }
}
