import React, { forwardRef, useImperativeHandle } from 'react'
import { devinoDark, devinoLight, logoDark, logoLight } from '../assets/logos'
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
                    className={cn('@container main upup-w-full', {
                        'upup-h-[480px] upup-max-w-[600px]':
                            !providerValues.props.mini,
                        'upup-h-[397px] upup-max-w-[280px]':
                            providerValues.props.mini,
                    })}
                >
                    <section
                        aria-labelledby="drop-instructions"
                        className={cn(
                            'upup-shadow-wrapper upup-flex upup-h-full upup-w-full upup-select-none upup-flex-col upup-gap-3 upup-overflow-hidden upup-rounded-2xl upup-bg-white upup-px-5 upup-py-4',
                            {
                                'upup-bg-[#232323] dark:upup-bg-[#232323]':
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
                                className="@cs/main:text-sm upup-text-xs upup-leading-5 upup-text-[#6D6D6D]"
                            >
                                Add your documents here, you can upload up to{' '}
                                {providerValues.props.limit} files max
                            </p>
                        </ShouldRender>
                        <MainBox />

                        <div
                            className={cn(
                                '@cs/main:flex-row upup-flex upup-w-full upup-flex-col upup-items-center upup-justify-between upup-gap-1',
                                {
                                    'upup-flex-col': providerValues.props.mini,
                                },
                            )}
                        >
                            <a
                                href={'https://getupup.ca/'}
                                target={'_blank'}
                                rel="noopener noreferrer"
                                className="upup-z-[2147483647] upup-flex upup-items-center upup-gap-[5px]"
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
                                className="upup-flex upup-flex-row upup-items-center upup-justify-end upup-gap-1"
                            >
                                <span className="@cs/main:text-sm upup-mr-0.5 upup-text-xs upup-leading-5 upup-text-[#6D6D6D]">
                                    Built by{' '}
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
