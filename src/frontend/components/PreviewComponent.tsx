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
import FileIcon from './FileIcon'
import FilePreview from './FilePreview'
import ProgressBar from './shared/ProgressBar'

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
        upload: { filesProgressMap },
        props: { onFileClick },
        files,
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
    const progress = Math.floor(
        (filesProgressMap[file.name]?.loaded /
            filesProgressMap[file.name]?.total) *
            100,
    )

    return (
        <div
            className={`flex flex-1 gap-2 max-md:relative max-md:rounded max-md:bg-white max-md:p-2 max-md:shadow md:basis-32 ${
                files.length > 1 ? 'md:flex-col' : 'flex-col'
            }`}
            {...restProps}
        >
            <div
                className={`flex cursor-pointer items-center justify-center rounded bg-white md:relative ${
                    files.length > 1 ? '' : 'flex-1'
                } md:shadow-md`}
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
                <ProgressBar
                    className="absolute bottom-0 left-0 right-0"
                    progress={progress}
                />
            </div>
            <div className="flex flex-col items-start justify-between">
                <p className="flex-1 text-xs text-[#0B0B0B]">
                    {truncate(file.name, 20)}
                </p>
                <p className="text-xs text-[#6D6D6D]">
                    {bytesToSize(file.size)}
                </p>
                <FilePreview file={file} objectUrl={objectUrl} />
            </div>
        </div>
    )
})
