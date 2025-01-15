import React, {
    HTMLAttributes,
    MouseEventHandler,
    forwardRef,
    memo,
    useEffect,
    useState,
} from 'react'
import { TbX } from 'react-icons/tb'
import { useRootContext } from '../context/RootContext'
import { bytesToSize } from '../lib/file'
import FileIcon from './FileIcon'
import FilePreview from './FilePreview'
import ShouldRender from './shared/ShouldRender'

type Props = {
    file: File
    index: number
} & HTMLAttributes<HTMLDivElement>

export default memo(
    forwardRef<HTMLDivElement, Props>(function PreviewComponent(
        { file, index, ...restProps }: Props,
        ref,
    ) {
        const {
            handleFileRemove,
            upload: { filesProgressMap },
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

        if (!objectUrl) return null

        return (
            <div
                ref={ref}
                className="flex flex-col gap-2 rounded-xl border border-[#E7E7E7] p-4 lg:gap-[10px]"
                {...restProps}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="aspect-square h-full flex-shrink-0">
                            <FileIcon
                                extension={extension}
                                className="text-3xl text-blue-600"
                            />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-[#0B0B0B]">
                                {file.name}
                            </p>
                            <p className="text-xs text-[#6D6D6D]">
                                {bytesToSize(file.size)}
                            </p>
                            <FilePreview file={file} objectUrl={objectUrl} />
                        </div>
                    </div>
                    <button
                        className="rounded-full border border-[#858585] bg-gray-300 p-0.5"
                        onClick={onHandleFileRemove}
                        type="button"
                        disabled={!!progress}
                    >
                        <TbX className="h-4 w-4 text-[#858585]" />
                    </button>
                </div>
                <ShouldRender if={!!progress}>
                    <div className="flex items-center justify-between gap-[12px]">
                        <div className="h-[6px] flex-1 rounded-[4px] bg-[#F5F5F5]">
                            <div
                                className="h-full rounded-[4px]"
                                style={{
                                    width: progress + '%',
                                    background:
                                        progress == 100 ? '#8EA5E7' : '#C5CAFB',
                                }}
                            />
                        </div>
                        <span className="text-xs text-[#353535]">
                            {progress}%
                        </span>
                    </div>
                </ShouldRender>
            </div>
        )
    }),
)
