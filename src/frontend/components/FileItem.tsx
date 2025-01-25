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
import { cn } from '../lib/tailwind'
import FilePreview from './FilePreview'
import FilePreviewPortal from './FilePreviewPortal'
import ShouldRender from './shared/ShouldRender'

type Props = {
    file: File
}

export default memo(function FileItem({ file }: Props) {
    const {
        files,
        props: { dark, classNames },
    } = useRootContext()
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
            className={cn(
                'flex flex-1 gap-2 max-md:relative max-md:rounded max-md:border max-md:border-[#6D6D6D] max-md:bg-white md:basis-32',
                {
                    'md:flex-col': files.length > 1,
                    'flex-col': files.length === 1,
                    'max-md:bg-[#1F1F1F] max-md:dark:bg-[#1F1F1F]': dark,
                    [classNames.fileItemMultiple!]:
                        classNames.fileItemMultiple && files.length > 1,
                    [classNames.fileItemSingle!]:
                        classNames.fileItemSingle && files.length === 1,
                },
            )}
        >
            <FilePreview
                file={file}
                objectUrl={objectUrl}
                previewIsUnsupported={previewIsUnsupported}
                setPreviewIsUnsupported={setPreviewIsUnsupported}
            />
            <div
                className={cn(
                    'flex flex-col items-start justify-between max-md:p-2 max-md:pt-0',
                    classNames.fileInfo,
                )}
            >
                <p
                    className={cn(
                        'flex-1 text-xs text-[#0B0B0B]',
                        {
                            'text-white dark:text-white': dark,
                        },
                        classNames.fileName,
                    )}
                >
                    {truncate(file.name, 20)}
                </p>
                <p
                    className={cn(
                        'text-xs text-[#6D6D6D]',
                        classNames.fileSize,
                    )}
                >
                    {bytesToSize(file.size)}
                </p>
                <ShouldRender if={!previewIsUnsupported}>
                    <button
                        className={cn(
                            'text-xs text-blue-600',
                            {
                                'text-[#59D1F9] dark:text-[#59D1F9]': dark,
                            },
                            classNames.filePreviewButton,
                        )}
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
