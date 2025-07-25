'use client'

import React, { forwardRef, useImperativeHandle } from 'react'
import { TbLoader } from 'react-icons/tb/index.js'
import { devinoDark, devinoLight, logoDark, logoLight } from '../assets/logos'
import { FileWithParams, UpupUploaderProps } from '../shared/types'
import DefaultLoaderIcon from './components/DefaultLoaderIcon'
import MainBox from './components/MainBox'
import ShouldRender from './components/shared/ShouldRender'
import RootContext from './context/RootContext'
import useRootProvider from './hooks/useRootProvider'
import useUpload from './hooks/useUpload'
import { cn } from './lib/tailwind'

export type UpupUploaderRef = {
    useUpload(): {
        error?: string
        files: FileWithParams[]
        loading: boolean
        progress: number
        upload(): Promise<FileWithParams[] | undefined>
        resetState(): void
        dynamicUpload(
            files: File[] | FileWithParams[],
        ): Promise<FileWithParams[] | undefined>
        setFiles(newFiles: File[]): void
        dynamicallyReplaceFiles(files: File[] | FileWithParams[]): void
    }
}

export default forwardRef<UpupUploaderRef, UpupUploaderProps>(
    function UpupUploader(props, ref) {
        const providerValues = useRootProvider({
            ...props,
            icons: {
                ...props.icons,
                LoaderIcon: DefaultLoaderIcon,
            },
        })
        const uploadApi = useUpload({
            upload: providerValues.upload,
            files: providerValues.files,
            setFiles: providerValues.setFiles,
            dynamicUpload: providerValues.dynamicUpload,
            resetState: providerValues.resetState,
            dynamicallyReplaceFiles: providerValues.dynamicallyReplaceFiles,
        })

        useImperativeHandle(ref, () => ({
            useUpload: () => uploadApi,
        }))

        return (
            <RootContext.Provider value={providerValues}>
                <div className="upup-scope upup-h-full upup-w-full">
                    <div
                        className={cn('upup-w-full', {
                            'upup-h-[480px] upup-max-w-[600px]':
                                !providerValues.props.mini,
                            'upup-h-[397px] upup-max-w-[280px]':
                                providerValues.props.mini,
                        })}
                    >
                        <section
                            aria-labelledby="drop-instructions"
                            className={cn(
                                `upup-shadow-wrapper upup-relative ${
                                    providerValues.props.dark
                                        ? 'upup-bg-[#232323]'
                                        : 'upup-bg-white'
                                } upup-flex upup-h-full upup-w-full upup-select-none upup-flex-col upup-gap-3 upup-overflow-hidden upup-rounded-2xl upup-px-5 upup-py-4`,
                                {
                                    [providerValues.props.classNames
                                        .containerFull!]:
                                        providerValues.props.classNames
                                            .containerFull &&
                                        !providerValues.props.mini,

                                    [providerValues.props.classNames
                                        .containerMini!]:
                                        providerValues.props.classNames
                                            .containerMini &&
                                        providerValues.props.mini,
                                },
                            )}
                        >
                            <ShouldRender
                                if={providerValues.props.isProcessing}
                            >
                                <TbLoader
                                    className={cn(
                                        'upup-absolute upup-right-5 upup-animate-spin upup-text-xs upup-text-xs upup-leading-5 upup-text-[#0E2ADD] md:upup-text-xl',
                                        {
                                            'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]':
                                                providerValues.props.dark,
                                        },
                                    )}
                                />
                            </ShouldRender>
                            <ShouldRender if={providerValues.props.limit > 1}>
                                <p
                                    id="drop-instructions"
                                    className={cn(
                                        'upup-text-xs upup-leading-5 upup-text-[#6D6D6D] md:upup-text-sm',
                                        {
                                            'upup-text-gray-300 dark:upup-text-gray-300':
                                                providerValues.props.dark,
                                        },
                                    )}
                                >
                                    Add your documents here, you can upload up
                                    to {providerValues.props.limit} files max
                                </p>
                            </ShouldRender>
                            <MainBox />

                            <div
                                className={cn(
                                    'upup-flex upup-w-full upup-flex-col upup-items-center upup-justify-between upup-gap-1 md:upup-flex-row',
                                    {
                                        'upup-flex-col':
                                            providerValues.props.mini,
                                    },
                                )}
                            >
                                <a
                                    href={'https://getupup.ca/'}
                                    target={'_blank'}
                                    rel="noopener noreferrer"
                                    className="upup-flex upup-items-center upup-gap-[5px]"
                                >
                                    <ShouldRender
                                        if={providerValues.props.dark}
                                    >
                                        <img
                                            src={logoDark}
                                            width={61}
                                            height={13}
                                            alt="logo-dark"
                                        />
                                    </ShouldRender>
                                    <ShouldRender
                                        if={!providerValues.props.dark}
                                    >
                                        <img
                                            src={logoLight}
                                            width={61}
                                            height={13}
                                            alt="logo-light"
                                        />
                                    </ShouldRender>
                                </a>
                                <a
                                    href={'https://devino.ca/'}
                                    target={'_blank'}
                                    rel="noopener noreferrer"
                                    className="upup-flex upup-flex-row upup-items-center upup-justify-end upup-gap-1"
                                >
                                    <span
                                        className={cn(
                                            'upup-mr-0.5 upup-text-xs upup-leading-5 upup-text-[#6D6D6D] md:upup-text-sm',
                                            {
                                                'upup-text-gray-300 dark:upup-text-gray-300':
                                                    providerValues.props.dark,
                                            },
                                        )}
                                    >
                                        Built by{' '}
                                    </span>
                                    <ShouldRender
                                        if={providerValues.props.dark}
                                    >
                                        <img
                                            src={devinoDark}
                                            width={61}
                                            height={13}
                                            alt="logo-dark"
                                        />
                                    </ShouldRender>
                                    <ShouldRender
                                        if={!providerValues.props.dark}
                                    >
                                        <img
                                            src={devinoLight}
                                            width={61}
                                            height={13}
                                            alt="logo-light"
                                        />
                                    </ShouldRender>
                                </a>
                            </div>
                        </section>
                    </div>
                </div>
            </RootContext.Provider>
        )
    },
)
