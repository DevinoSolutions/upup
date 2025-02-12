import React, {
    forwardRef,
    HTMLAttributes,
    memo,
    MouseEventHandler,
    useMemo,
} from 'react'
import { createPortal } from 'react-dom'
import { useRootContext } from '../context/RootContext'
import { fileGetIsImage } from '../lib/file'
import { cn } from '../lib/tailwind'
import ShouldRender from './shared/ShouldRender'

export default memo(
    forwardRef<
        HTMLDivElement,
        HTMLAttributes<HTMLDivElement> & {
            onStopPropagation: MouseEventHandler<HTMLDivElement>
            fileUrl: string
            fileName: string
            fileType: string
        }
    >(function FilePreviewPortal(
        { onStopPropagation, fileUrl, fileName, fileType, ...restProps },
        ref,
    ) {
        const {
            props: { dark, classNames },
        } = useRootContext()
        const isImage = useMemo(() => fileGetIsImage(fileType), [fileType])

        return createPortal(
            <div
                className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40"
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
                        <ShouldRender if={isImage}>
                            <img
                                src={fileUrl}
                                alt={fileName}
                                className="h-full w-full rounded object-contain"
                            />
                        </ShouldRender>
                        <ShouldRender if={!isImage}>
                            <object
                                data={fileUrl}
                                width="100%"
                                height="100%"
                                name={fileName}
                                type={fileType}
                            >
                                <p>Loading...</p>
                            </object>
                        </ShouldRender>
                    </div>
                </div>
            </div>,
            document.body,
        )
    }),
)
