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

    /** Map UploadSource (lowercase) to FileSource (uppercase) for filtering */
    const sourceToFileSource: Record<string, FileSource> = useMemo(() => ({
        local: FileSource.LOCAL,
        camera: FileSource.CAMERA,
        url: FileSource.URL,
        google_drive: FileSource.GOOGLE_DRIVE,
        onedrive: FileSource.ONE_DRIVE,
        dropbox: FileSource.DROPBOX,
        microphone: FileSource.MICROPHONE,
        screen: FileSource.SCREEN,
    }), [])

    const chosenAdapters = useMemo(
        () => {
            const fileSources = sources.map(s => sourceToFileSource[s]).filter(Boolean)
            return Object.values(uploadAdapterObject).filter(item =>
                fileSources.includes(item.id),
            )
        },
        [sources, sourceToFileSource],
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
