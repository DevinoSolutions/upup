import React, { forwardRef } from 'react'
import { UpupUploaderProps, UpupUploaderRef } from '../shared/types'
import AdapterSelector from './components/AdapterSelector'
import DropZone from './components/DropZone'
import MetaVersion from './components/MetaVersion'
import Preview from './components/Preview'
import UploadAdapterView from './components/UploadAdapterView'
import { RootProvider } from './context/RootContext'
import useDragAndDrop from './hooks/useDragAndDrop'

const getDivClassName = (mini: boolean) => {
    let className =
        'relative flex w-full  select-none flex-col overflow-hidden rounded-md border bg-[#f4f4f4] dark:bg-[#1f1f1f] '
    className += mini
        ? 'h-[min(98svh,12rem)] max-w-[min(98svh,12rem)]'
        : 'h-[min(98svh,35rem)] max-w-[min(98svh,46rem)]'

    return className
}

/**
 *
 * @param storageConfig storage configuration
 * @param baseConfigs base configurations
 * @param uploadAdapters the methods you want to enable for the user to upload the files. Default value is ['INTERNAL']
 * @param googleConfigs google configurations
 * @param oneDriveConfigs one drive configurations
 * @param loader loader
 * @param ref referrer to the component instance to access its method uploadFiles from the parent component
 * @constructor
 */
export default forwardRef<UpupUploaderRef, UpupUploaderProps>(
    function UpupUploader(props, ref) {
        const { mini = false } = props

        const {
            isDragging,
            setIsDragging,
            handleDragEnter,
            handleDragLeave,
            containerRef,
        } = useDragAndDrop()

        return (
            <RootProvider {...props}>
                <div
                    className={getDivClassName(mini)}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    ref={containerRef}
                >
                    <DropZone
                        isDragging={isDragging}
                        setIsDragging={setIsDragging}
                    />
                    <UploadAdapterView />
                    <Preview ref={ref} />
                    <div className="h-full p-2">
                        <div className="grid h-full w-full grid-rows-[1fr,auto] place-items-center rounded-md border border-dashed border-[#dfdfdf] transition-all">
                            <AdapterSelector />
                            <MetaVersion />
                        </div>
                    </div>
                </div>
            </RootProvider>
        )
    },
)
