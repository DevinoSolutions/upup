import React from 'react'
import { UpupUploaderProps } from '../shared/types'
import MainBox from './components/MainBox'
import RootContext from './context/RootContext'
import useDragAndDrop from './hooks/useDragAndDrop'
import useRootProvider from './hooks/useRootProvider'

const getDivClassName = (mini: boolean) => {
    let className =
        'flex flex-col gap-3 shadow-wrapper select-none overflow-hidden rounded-2xl bg-white dark:bg-[#232323] py-4 px-5 '
    className += mini
        ? 'h-[397px] w-full max-w-[280px]'
        : 'h-[480px] w-full max-w-[600px]'

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
                <div className="flex items-center justify-between gap-8">
                    <p className="text-xs leading-5 text-[#6D6D6D] sm:text-sm">
                        Add your documents here, you can upload up to{' '}
                        {providerValues.props.limit} file
                        {providerValues.props.limit > 1 ? 's' : ''} max
                    </p>
                </div>
                <MainBox
                    isDragging={isDragging}
                    setIsDragging={setIsDragging}
                />

                <div className="flex items-center justify-between gap-1 max-sm:flex-col">
                    <p className="text-xs leading-5 text-[#6D6D6D] sm:text-sm">
                        {supportText} with a{' '}
                        {providerValues.props.maxFileSize.size}{' '}
                        {providerValues.props.maxFileSize.unit} limit
                    </p>
                    <div className="flex items-center gap-[5px]">
                        <span className="text-xs leading-5 text-[#6D6D6D] sm:text-sm">
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
            </div>
        </RootContext.Provider>
    )
}
