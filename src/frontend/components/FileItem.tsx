import React, {
    MouseEventHandler,
    memo,
    useCallback,
    useEffect,
    useState,
} from 'react'
import truncate from 'truncate'
import { useRootContext } from '../context/RootContext'
import { bytesToSize } from '../lib/file'
import FilePreview from './FilePreview'
import FilePreviewPortal from './FilePreviewPortal'
import ShouldRender from './shared/ShouldRender'

type Props = {
    file: File
}

export default memo(function FileItem({ file }: Props) {
    const { files } = useRootContext()
    const [objectUrl, setObjectUrl] = useState<string>('')
    const [showPreviewPortal, setShowPreviewPortal] = useState(false)
    const [previewIsUnsupported, setPreviewIsUnsupported] = useState(false)

    const stopPropagation: MouseEventHandler<HTMLElement> = useCallback(e => {
        e.stopPropagation()
    }, [])

    const handleShowPreviewPortal: MouseEventHandler<HTMLSpanElement> =
        useCallback(e => {
            stopPropagation(e)
            setShowPreviewPortal(true)
        }, [])

    useEffect(() => {
        // Create the object URL when the file changes
        const url = URL.createObjectURL(file)
        setObjectUrl(url)

        // Clean up the object URL when the component unmounts or when the file changes
        return () => {
            if (url) URL.revokeObjectURL(url)
        }
    }, [file])

    return (
        <div
            className={`flex flex-1 gap-2 max-md:relative max-md:rounded max-md:bg-white max-md:p-2 max-md:shadow md:basis-32 ${
                files.length > 1 ? 'md:flex-col' : 'flex-col'
            }`}
        >
            <FilePreview
                file={file}
                objectUrl={objectUrl}
                previewIsUnsupported={previewIsUnsupported}
                setPreviewIsUnsupported={setPreviewIsUnsupported}
            />
            <div className="flex flex-col items-start justify-between">
                <p className="flex-1 truncate text-xs text-[#0B0B0B]">
                    {truncate(file.name, 20)}
                </p>
                <p className="text-xs text-[#6D6D6D]">
                    {bytesToSize(file.size)}
                </p>
                <ShouldRender if={!previewIsUnsupported}>
                    <button
                        className="text-xs text-blue-600"
                        onClick={handleShowPreviewPortal}
                    >
                        Click to preview
                    </button>
                    <ShouldRender if={showPreviewPortal}>
                        <FilePreviewPortal
                            onClick={stopPropagation}
                            onHidePortal={() => setShowPreviewPortal(false)}
                            file={file}
                            objectUrl={objectUrl}
                        />
                    </ShouldRender>
                </ShouldRender>
            </div>
        </div>
    )
})
