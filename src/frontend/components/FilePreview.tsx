import React, { MouseEventHandler, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import FileViewer from 'react-file-viewer'
import { v4 as uuidv4 } from 'uuid'
import { useRootContext } from '../context/RootContext'
import FileIcon from './FileIcon'

export default function FilePreview({
    file,
    objectUrl,
}: {
    file: File
    objectUrl: string
}) {
    const {
        props: { onError },
    } = useRootContext()
    const [showPreview, setShowPreview] = useState(false)
    const extension = file.name.split('.').pop()?.toLowerCase()

    const stopPropagation: MouseEventHandler<HTMLElement> = useCallback(e => {
        e.stopPropagation()
    }, [])

    const handleShowPreview: MouseEventHandler<HTMLSpanElement> = useCallback(
        e => {
            stopPropagation(e)
            setShowPreview(true)
        },
        [],
    )

    // Show a simple thumbnail by default
    if (!showPreview)
        return (
            <button
                className="cursor-pointer text-xs text-blue-600"
                onClick={handleShowPreview}
            >
                Click to preview
            </button>
        )

    // Show full preview in a portal when clicked
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={stopPropagation}
        >
            <div className="relative h-[90vh] w-[90vw] bg-white p-4 dark:bg-gray-800">
                <div className="absolute inset-0 m-4">
                    {file.type.startsWith('image/') ? (
                        <img
                            src={objectUrl}
                            alt={file.name}
                            className="h-full w-full rounded-md object-contain"
                        />
                    ) : (
                        <FileViewer
                            key={uuidv4()}
                            fileType={extension}
                            filePath={objectUrl}
                            onError={(e: Error) => {
                                onError('Error in file preview:' + e, file)
                                return (
                                    <FileIcon
                                        key={uuidv4()}
                                        extension={extension}
                                    />
                                )
                            }}
                            errorComponent={() => (
                                <FileIcon
                                    key={uuidv4()}
                                    extension={extension}
                                />
                            )}
                        />
                    )}
                </div>
                <button
                    className="absolute right-2 top-2 z-10 rounded-full bg-gray-800 p-1 text-white hover:bg-gray-700"
                    onClick={() => setShowPreview(false)}
                >
                    ×
                </button>
            </div>
        </div>,
        document.body,
    )
}
