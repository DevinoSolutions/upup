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
                className="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/40"
                ref={ref}
                {...restProps}
            >
                <div className="upup-relative upup-h-[90vh] upup-w-[90vw] upup-p-4">
                    <div
                        className={cn(
                            'upup-absolute upup-inset-0 upup-m-4 upup-bg-white',
                            {
                                'upup-bg-[#232323] dark:upup-bg-[#232323]':
                                    dark,
                            },
                            classNames.filePreviewPortal,
                        )}
                        onClick={onStopPropagation}
                    >
                        <ShouldRender if={isImage}>
                            <img
                                src={fileUrl}
                                alt={fileName}
                                className="upup-h-full upup-w-full upup-rounded upup-object-contain"
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
