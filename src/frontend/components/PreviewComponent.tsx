import React, {
    HTMLAttributes,
    MouseEventHandler,
    memo,
    useEffect,
    useState,
} from 'react'
import { TbX } from 'react-icons/tb'
import truncate from 'truncate'
import { useRootContext } from '../context/RootContext'
import { bytesToSize } from '../lib/file'
import { UploadState } from '../lib/storage/provider'
import FileIcon from './FileIcon'
import FilePreview from './FilePreview'
import ShouldRender from './shared/ShouldRender'

type Props = {
    file: File
    index: number
} & HTMLAttributes<HTMLDivElement>

export default memo(function PreviewComponent({
    file,
    index,
    ...restProps
}: Props) {
    const {
        handleFileRemove,
        upload: { filesStates, pauseUpload, resumeUpload, retryFailedUpload },
        props: { onFileClick },
    } = useRootContext()
    const [objectUrl, setObjectUrl] = useState<string>('')
    const extension = file.name.split('.').pop()?.toLowerCase()

    const onHandleFileRemove: MouseEventHandler<HTMLButtonElement> = e => {
        e.stopPropagation()
        handleFileRemove(file)
    }

    useEffect(() => {
        // Create the object URL when the file changes
        const url = URL.createObjectURL(file)
        setObjectUrl(url)

        // Clean up the object URL when the component unmounts or when the file changes
        return () => {
            if (url) URL.revokeObjectURL(url)
        }
    }, [file])
    const fileState = filesStates[file.name]
    const progress = Math.floor((fileState?.progress / file.size) * 100)

    const handleRetry = () => retryFailedUpload(file)

    return (
        <div
            className="flex flex-1 gap-2 max-md:relative max-md:rounded max-md:bg-white max-md:p-2 max-md:shadow md:basis-32 md:flex-col"
            {...restProps}
        >
            <div
                className="flex cursor-pointer items-center justify-center rounded bg-white md:relative md:aspect-video md:shadow-md"
                onClick={() => onFileClick(file)}
            >
                <FileIcon
                    extension={extension}
                    className="text-4xl text-blue-600 md:text-7xl"
                />
                <button
                    className="z-1 absolute -right-2 -top-2 rounded-full border border-[#858585] bg-[#f4f4f4] p-0.5 max-md:scale-90"
                    onClick={onHandleFileRemove}
                    type="button"
                    disabled={!!progress}
                >
                    <TbX className="h-4 w-4 text-[#858585]" />
                </button>
                <div className="absolute bottom-0 left-0 right-0">
                    <ShouldRender if={fileState?.status === UploadState.FAILED}>
                        <button
                            className="w-full rounded bg-red-100 px-2 py-1 text-xs text-red-600"
                            onClick={handleRetry}
                        >
                            Retry Upload
                        </button>
                    </ShouldRender>
                    <ShouldRender
                        if={fileState?.status === UploadState.UPLOADING}
                    >
                        <div className="h-1 bg-gray-200">
                            <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <button
                            className="mt-1 w-full rounded bg-gray-100 px-2 py-1 text-xs"
                            onClick={() => pauseUpload(file.name)}
                        >
                            Pause
                        </button>
                    </ShouldRender>
                    <ShouldRender if={fileState?.status === UploadState.PAUSED}>
                        <button
                            className="mt-1 w-full rounded bg-gray-100 px-2 py-1 text-xs"
                            onClick={() => resumeUpload(file)}
                        >
                            Resume
                        </button>
                    </ShouldRender>
                </div>
            </div>
            <div className="flex flex-col items-start justify-between">
                <p className="flex-1 text-xs text-[#0B0B0B]">
                    {truncate(file.name, 30)}
                </p>
                <p className="text-xs text-[#6D6D6D]">
                    {bytesToSize(file.size)}
                </p>
                <FilePreview file={file} objectUrl={objectUrl} />
            </div>
        </div>
    )
})
