import React from 'react'
import { UpupUploaderProps } from '../shared/types'
import MainBox from './components/MainBox'
import ShouldRender from './components/shared/ShouldRender'
import RootContext from './context/RootContext'
import useDragAndDrop from './hooks/useDragAndDrop'
import useRootProvider from './hooks/useRootProvider'
import { cn } from './lib/tailwind'

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
    const providerValues = useRootProvider({
        ...props,
        loader: props.loader || (
            <p className={cn({ 'text-[#6D6D6D]': props.dark })}>loading...</p>
        ),
    })
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
                className={cn('w-dvw @container/main', {
                    'h-[480px] max-w-[600px]': !providerValues.props.mini,
                    'h-[397px] max-w-[280px]': providerValues.props.mini,
                })}
            >
                <div
                    className={cn(
                        'shadow-wrapper flex h-full w-full select-none flex-col gap-3 overflow-hidden rounded-2xl bg-white px-5 py-4',
                        {
                            'bg-[#232323] dark:bg-[#232323]':
                                providerValues.props.dark,

                            [providerValues.props.classNames.containerFull!]:
                                providerValues.props.classNames.containerFull &&
                                !providerValues.props.mini,
                            [providerValues.props.classNames.containerMini!]:
                                providerValues.props.classNames.containerMini &&
                                providerValues.props.mini,
                        },
                    )}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    ref={containerRef}
                >
                    <ShouldRender if={providerValues.props.limit > 1}>
                        <p className="text-xs leading-5 text-[#6D6D6D] @cs/main:text-sm">
                            Add your documents here, you can upload up to{' '}
                            {providerValues.props.limit} files max
                        </p>
                    </ShouldRender>
                    <MainBox
                        isDragging={isDragging}
                        setIsDragging={setIsDragging}
                    />

                    <div
                        className={cn(
                            'flex flex-col items-center justify-between gap-1 @cs/main:flex-row',
                            {
                                'flex-col': providerValues.props.mini,
                            },
                        )}
                    >
                        <p className="text-xs leading-5 text-[#6D6D6D] @cs/main:text-sm">
                            {supportText}
                        </p>
                        <div className="flex items-center gap-[5px]">
                            <span className="text-xs leading-5 text-[#6D6D6D] @cs/main:text-sm">
                                Powered by{' '}
                            </span>
                            <ShouldRender if={providerValues.props.dark}>
                                <img
                                    src="https://i.ibb.co/HGBrgp7/logo-dark.png"
                                    width={61}
                                    height={13}
                                />
                            </ShouldRender>
                            <ShouldRender if={!providerValues.props.dark}>
                                <img
                                    src="https://i.ibb.co/7S5q81d/logo-white.png"
                                    width={61}
                                    height={13}
                                />
                            </ShouldRender>
                        </div>
                    </div>
                </div>
            </div>
        </RootContext.Provider>
    )
}
