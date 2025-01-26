import React, {
    forwardRef,
    HTMLAttributes,
    memo,
    MouseEventHandler,
    useMemo,
} from 'react'
import { createPortal } from 'react-dom'
import FileViewer from 'react-file-viewer'
import { useRootContext } from '../context/RootContext'
import { fileGetExtension, fileGetIsImage } from '../lib/file'
import { cn } from '../lib/tailwind'

export default memo(
    forwardRef<
        HTMLDivElement,
        HTMLAttributes<HTMLDivElement> & {
            onStopPropagation: MouseEventHandler<HTMLDivElement>
            fileUrl: string
            fileName: string
            fileId: string
            fileType: string
        }
    >(function FilePreviewPortal(
        {
            onStopPropagation,
            fileUrl,
            fileName,
            fileId,
            fileType,
            ...restProps
        },
        ref,
    ) {
        const {
            props: { dark, classNames },
        } = useRootContext()
        const isImage = useMemo(() => fileGetIsImage(fileType), [fileType])
        const extension = useMemo(
            () => fileGetExtension(fileType, fileName),
            [fileType, fileName],
        )

        return createPortal(
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                ref={ref}
                {...restProps}
            >
                <div className="relative h-[90vh] w-[90vw] p-4">
                    <div
                        className={cn(
                            'absolute inset-0 m-4 bg-white',
                            {
                                'bg-[#232323] dark:bg-[#232323]': dark,
                            },
                            classNames.filePreviewPortal,
                        )}
                        onClick={onStopPropagation}
                    >
                        {isImage ? (
                            <img
                                src={fileUrl}
                                alt={fileName}
                                className="h-full w-full rounded object-contain"
                            />
                        ) : (
                            <FileViewer
                                key={fileId}
                                fileType={extension}
                                filePath={fileUrl}
                            />
                        )}
                    </div>
                </div>
            </div>,
            document.body,
        )
    }),
)
