import React, { forwardRef, useImperativeHandle } from 'react'
import { FileWithProgress, UpupUploaderProps } from '../shared/types'
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
        files: Array<FileWithProgress>
        loading: boolean
        progress: number
        upload(): Promise<string[] | undefined>
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

        useImperativeHandle(ref, () => ({
            useUpload: () =>
                useUpload({
                    upload: providerValues.upload,
                    files: providerValues.files,
                }),
        }))

        return (
            <RootContext.Provider value={providerValues}>
                <div
                    className={cn(
                        'w-full @container/main',
                        {
                            'h-[480px] max-w-[600px]': !providerValues.props.mini,
                            'h-[397px] max-w-[280px]': providerValues.props.mini,
                        },
                        providerValues.props.mini
                            ? providerValues.props.classNames?.containerMiniWrapper
                            : providerValues.props.classNames?.containerFullWrapper

                    )}
                >
                    <section
                        aria-labelledby="drop-instructions"
                        className={cn(
                            'shadow-wrapper flex h-full w-full select-none flex-col gap-3 overflow-hidden rounded-2xl bg-white px-5 py-4',
                            {
                                'bg-[#232323] dark:bg-[#232323]':
                                    providerValues.props.dark,

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
                        <ShouldRender if={providerValues.props.limit > 1}>
                            <p
                                id="drop-instructions"
                                className="text-xs leading-5 text-[#6D6D6D] @cs/main:text-sm"
                            >
                                Add your documents here, you can upload up to{' '}
                                {providerValues.props.limit} files max
                            </p>
                        </ShouldRender>
                        <MainBox />

                        <div
                            className={cn(
                                'flex flex-col items-center justify-end gap-1 @cs/main:flex-row',
                                {
                                    'flex-col': providerValues.props.mini,
                                },
                            )}
                        >
                            <div className="z-[2147483647] flex items-center gap-[5px]">
                                <span className="text-xs leading-5 text-[#6D6D6D] @cs/main:text-sm">
                                    Powered by{' '}
                                </span>
                                <ShouldRender if={providerValues.props.dark}>
                                    <img
                                        src="https://i.ibb.co/HGBrgp7/logo-dark.png"
                                        width={61}
                                        height={13}
                                        alt="logo-dark"
                                    />
                                </ShouldRender>
                                <ShouldRender if={!providerValues.props.dark}>
                                    <img
                                        src="https://i.ibb.co/7S5q81d/logo-white.png"
                                        width={61}
                                        height={13}
                                        alt="logo-light"
                                    />
                                </ShouldRender>
                            </div>
                        </div>
                    </section>
                </div>
            </RootContext.Provider>
        )
    },
)
