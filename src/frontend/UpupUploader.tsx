import React, { forwardRef, useImperativeHandle } from 'react'
import devinoDark from '../assets/devino-dark.png'
import devinoLight from '../assets/devino-light.png'
import logoDark from '../assets/logo-dark.png'
import logoLight from '../assets/logo-white.png'
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
                    className={cn('w-full @container/main', {
                        'h-[480px] max-w-[600px]': !providerValues.props.mini,
                        'h-[397px] max-w-[280px]': providerValues.props.mini,
                    })}
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
                                'flex w-full flex-col items-center justify-between gap-1 @cs/main:flex-row',
                                {
                                    'flex-col': providerValues.props.mini,
                                },
                            )}
                        >
                            <a
                                href={'https://getupup.ca/'}
                                target={'_blank'}
                                rel="noopener noreferrer"
                                className="z-[2147483647] flex items-center gap-[5px]"
                            >
                                <ShouldRender if={providerValues.props.dark}>
                                    <img
                                        src={logoDark}
                                        width={61}
                                        height={13}
                                        alt="logo-dark"
                                    />
                                </ShouldRender>
                                <ShouldRender if={!providerValues.props.dark}>
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
                                className="flex flex-row items-center justify-end gap-1"
                            >
                                <span className="mr-0.5 text-xs leading-5 text-[#6D6D6D] @cs/main:text-sm">
                                    Powered by{' '}
                                </span>
                                <ShouldRender if={providerValues.props.dark}>
                                    <img
                                        src={devinoDark}
                                        width={61}
                                        height={13}
                                        alt="logo-dark"
                                    />
                                </ShouldRender>
                                <ShouldRender if={!providerValues.props.dark}>
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
            </RootContext.Provider>
        )
    },
)
