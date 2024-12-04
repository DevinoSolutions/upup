import React, {
    HTMLAttributes,
    forwardRef,
    memo,
    useEffect,
    useMemo,
    useRef,
} from 'react'
import { TbX } from 'react-icons/tb'
import { bytesToSize } from '../../lib'
import { FileHandlerProps, FileWithId } from '../../types/file'
import FilePreview from '../FilePreview'

type Props = {
    setFiles: FileHandlerProps['setFiles']
    multiple?: boolean
    mini?: boolean
    file: FileWithId
    index: number
    handleFileRemove: (file: FileWithId) => void
} & HTMLAttributes<HTMLDivElement>

export default memo(
    forwardRef<HTMLDivElement, Props>(function PreviewComponent(
        {
            setFiles,
            multiple,
            mini,
            file,
            index,
            handleFileRemove,
            ...restProps
        }: Props,
        ref,
    ) {
        const objectUrls = useRef<string[]>([])

        useEffect(() => {
            return () => {
                objectUrls.current.forEach(url => URL.revokeObjectURL(url))
                objectUrls.current = []
            }
        }, [])

        const objectUrl = useMemo(() => {
            const url = URL.createObjectURL(file)
            if (!objectUrls.current.includes(url)) objectUrls.current.push(url)

            return url
        }, [file])

        return (
            <div
                ref={ref}
                className="relative flex h-full max-h-fit w-full flex-col items-start dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                {...restProps}
            >
                <div
                    className={
                        'relative w-full cursor-pointer rounded-md object-cover shadow hover:bg-[#e9ecef] hover:text-[#1f1f1f] hover:shadow-xl active:bg-[#dfe6f1] ' +
                        (multiple ? 'h-40' : 'h-[90%]')
                    }
                >
                    <FilePreview file={file} objectUrl={objectUrl} />
                </div>
                {!mini && (
                    <div className="relative mt-1 w-full">
                        <div className="w-full pr-6">
                            <div className="w-full overflow-hidden">
                                <p
                                    className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium"
                                    title={file.name}
                                >
                                    {file.name}
                                </p>
                                <p className="text-[10px] font-medium text-gray-500">
                                    {bytesToSize(file.size)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <button
                    className="absolute -right-1 -top-1 z-10 rounded-full bg-black p-0.5"
                    onClick={() => handleFileRemove(file)}
                    type="button"
                >
                    <TbX className="h-4 w-4 text-white" />
                </button>
            </div>
        )
    }),
)
