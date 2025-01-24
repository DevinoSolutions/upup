import React, {
    forwardRef,
    HTMLAttributes,
    memo,
    MouseEventHandler,
} from 'react'
import { createPortal } from 'react-dom'
import FileViewer from 'react-file-viewer'
import { v4 as uuidv4 } from 'uuid'
import { useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'

export default memo(
    forwardRef<
        HTMLDivElement,
        HTMLAttributes<HTMLDivElement> & {
            onHidePortal: MouseEventHandler<HTMLDivElement>
            objectUrl: string
            file: File
        }
    >(function FilePreviewPortal(
        { onClick, onHidePortal, objectUrl, file, ...restProps },
        ref,
    ) {
        const {
            props: { dark },
        } = useRootContext()
        const fileName = file.name
        const isImage = file.type.startsWith('image/')
        const extension = file.type.split('/')[1]

        return createPortal(
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                onClick={onHidePortal}
                ref={ref}
                {...restProps}
            >
                <div className="relative h-[90vh] w-[90vw] p-4">
                    <div
                        className={cn('absolute inset-0 m-4 bg-white', {
                            'bg-black dark:bg-black': dark,
                        })}
                        onClick={onClick}
                    >
                        {isImage ? (
                            <img
                                src={objectUrl}
                                alt={fileName}
                                className="h-full w-full rounded object-contain"
                            />
                        ) : (
                            <FileViewer
                                key={uuidv4()}
                                fileType={extension}
                                filePath={objectUrl}
                            />
                        )}
                    </div>
                </div>
            </div>,
            document.body,
        )
    }),
)
