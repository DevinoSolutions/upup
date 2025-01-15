import React from 'react'
import { UpupUploaderProps } from '../shared/types'
import AdapterSelector from './components/AdapterSelector'
import { Close } from './components/Icons'
import Preview from './components/Preview'
import RootContext from './context/RootContext'
import useDragAndDrop from './hooks/useDragAndDrop'
import useRootProvider from './hooks/useRootProvider'

const getDivClassName = (mini: boolean) => {
    let className =
        'flex flex-col gap-[15px] lg:gap-[20px] shadow-wrapper select-none overflow-hidden rounded-2xl bg-white dark:bg-[#232323] p-[15px] lg:p-[25px] '
    className += mini
        ? 'h-[clamp(100%,100%,397px)] w-[clamp(100%,100%,280px)]'
        : 'h-[clamp(100%,100%,480px)] w-[clamp(100%,100%,600px)]'

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
export default function UpupUploader(props: UpupUploaderProps) {
    const providerValues = useRootProvider(props)
    const supportText =
        providerValues.props.accept === '*'
            ? 'Supports all files'
            : `Only supports ${providerValues.props.accept
                  .split(',')
                  .map(item => `.${item.split('/')[1]}`)
                  .join(', ')} `
    const {
        isDragging,
        setIsDragging,
        handleDragEnter,
        handleDragLeave,
        containerRef,
    } = useDragAndDrop()

    return (
        <RootContext.Provider value={providerValues}>
            <div
                className={getDivClassName(providerValues.props.mini)}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                ref={containerRef}
            >
                {/* <UploadAdapterView /> */}
                <div className="flex items-center justify-between gap-8">
                    <p className="text-xs leading-5 text-[#6D6D6D] lg:text-sm">
                        Add your documents here, you can upload up to{' '}
                        {providerValues.props.limit} file
                        {providerValues.props.limit > 1 ? 's' : ''} max
                    </p>
                    <span className="dark:[&_path]:fill-[#0B0B0B]">
                        <Close />
                    </span>
                </div>
                <div className="relative flex-1 ">
                    <AdapterSelector
                        isDragging={isDragging}
                        setIsDragging={setIsDragging}
                    />
                </div>

                <p className="text-xs leading-5 text-[#6D6D6D] lg:text-sm">
                    {supportText}
                </p>
                <Preview />
                <div className="flex items-center justify-end gap-[5px]">
                    <span className="text-xs leading-5 text-[#6D6D6D] lg:text-sm">
                        Powered by{' '}
                    </span>
                    <img
                        src="https://i.ibb.co/HGBrgp7/logo-dark.png"
                        className="hidden dark:visible"
                        width={61}
                        height={13}
                    />
                    <img
                        src="https://i.ibb.co/7S5q81d/logo-white.png"
                        className="dark:hidden"
                        width={61}
                        height={13}
                    />
                </div>
            </div>
        </RootContext.Provider>
    )
}
