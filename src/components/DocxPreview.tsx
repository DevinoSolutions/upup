import { FileIcon } from 'components'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import FileViewer from 'react-file-viewer'
import { TbFileText } from 'react-icons/tb'
import { PreviewProps } from 'types/file'

export default function DocxPreview({ file, objectUrl }: PreviewProps) {
    const [showPreview, setShowPreview] = useState(false)

    // Show a simple thumbnail by default
    if (!showPreview) {
        return (
            <div
                className="relative h-full w-full cursor-pointer bg-white dark:bg-gray-800"
                onClick={() => setShowPreview(true)}
            >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                    <TbFileText className="h-12 w-12 text-blue-600" />
                    <span className="text-center text-sm text-gray-600 dark:text-gray-300">
                        {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                        Click to preview
                    </span>
                </div>
            </div>
        )
    }

    // Show full preview in a portal when clicked
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative h-[90vh] w-[90vw] bg-white p-4">
                <div className="absolute inset-0 m-4">
                    <FileViewer
                        key={`docx-${file.id || file.name}-${Date.now()}`}
                        fileType="docx"
                        filePath={objectUrl}
                        onError={(e: Error) => {
                            console.error('Error in DOCX preview:', e)
                            setShowPreview(false)
                            return <FileIcon extension="docx" />
                        }}
                        errorComponent={() => <FileIcon extension="docx" />}
                    />
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
