import { FileIcon } from 'components'
import { bytesToSize } from 'lib'
import {
    Dispatch,
    HTMLAttributes,
    SetStateAction,
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react'
import FileViewer from 'react-file-viewer'
import { TbX } from 'react-icons/tb'

function getFilePreviewComponent({ name, type }: File, objectUrl: string) {
    const extension = name.split('.').pop()?.toLowerCase()
    if (type.startsWith('image/'))
        return (
            <img
                src={objectUrl}
                alt={name}
                className="absolute h-full w-full rounded-md object-cover shadow"
            />
        )

    return (
        <div className="h-full w-full">
            <FileViewer
                fileType={extension}
                filePath={objectUrl}
                onError={(e: Error) => {
                    console.log('error in file-viewer:', e)
                    return (
                        <FileIcon
                            extension={name.split('.').pop()?.toLowerCase()}
                        />
                    )
                }}
                unsupportedComponent={FileIcon}
                errorComponent={FileIcon}
            />
        </div>
    )
}

type Props = {
    setFiles: Dispatch<SetStateAction<File[]>>
    multiple?: boolean
    mini?: boolean
    file: File
    index: number
} & HTMLAttributes<HTMLDivElement>

export default memo(
    forwardRef<HTMLDivElement, Props>(function PreviewComponent(
        {
            setFiles,
            multiple, // handleUpload,
            mini,
            file,
            index,
            ...restProps
        }: Props,
        ref,
    ) {
        // Add a ref to store object URLs
        const objectUrls = useRef<string[]>([])

        // Cleanup object URLs when component unmounts or files change
        useEffect(() => {
            return () => {
                objectUrls.current.forEach(url => URL.revokeObjectURL(url))
                objectUrls.current = []
            }
        }, [])

        // Create object URL for a file
        const getObjectUrl = useCallback((f: File) => {
            const url = URL.createObjectURL(f)
            objectUrls.current.push(url)
            return url
        }, [])

        const objectUrl = useMemo(() => getObjectUrl(file), [file])
        /**
         * Remove file from files array
         */
        const removeFile = () =>
            setFiles(prev => [...prev.filter((_, i) => i !== index)])

        return (
            <div
                ref={ref}
                className="relative flex h-full w-full flex-col items-start dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                {...restProps}
            >
                <div
                    className={
                        'w-full cursor-pointer rounded-md object-cover shadow hover:bg-[#e9ecef]  hover:text-[#1f1f1f] hover:shadow-xl active:bg-[#dfe6f1] ' +
                        (multiple ? 'h-40' : 'h-[90%]')
                    }
                >
                    {getFilePreviewComponent(file, objectUrl)}
                </div>
                {!mini && (
                    <div className="flex w-full items-center justify-between">
                        <div>
                            <p className="mt-1 text-xs font-medium">
                                {file.name}
                            </p>
                            <p className="text-[10px] font-medium text-gray-500">
                                {bytesToSize(file.size)}
                            </p>
                        </div>
                    </div>
                )}
                <button
                    className="absolute -right-1 -top-1 rounded-full bg-black"
                    onClick={removeFile}
                    type="button"
                >
                    <TbX className="h-4 w-4 text-white" />
                </button>
            </div>
        )
    }),
)
