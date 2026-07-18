'use client'

import React, { forwardRef, lazy, Suspense, useImperativeHandle } from 'react'
import { cn } from '@upupjs/core/internal'
import type { UploadFile } from '@upupjs/core'
import { UploaderProps } from './shared/types'
import Icon from './components/Icon'
import DefaultLoaderIcon from './components/DefaultLoaderIcon'
import UploaderPanel from './components/UploaderPanel'
import { UploaderContextProvider } from './context/UploaderContext'
import useUploaderController from './hooks/useUploaderController'
import useUpload from './hooks/useUpload'
import { UpupThemeProvider } from './theme'

const ImageEditorInline = lazy(() => import('./components/ImageEditorInline'))
const ImageEditorModal = lazy(() => import('./components/ImageEditorModal'))

export type UploaderRef = {
    useUpload(): {
        error?: string | undefined
        files: UploadFile[]
        loading: boolean
        progress: number
        upload(): Promise<UploadFile[] | undefined>
        resetState(): void
        uploadFiles(
            files: File[] | UploadFile[],
        ): Promise<UploadFile[] | undefined>
        setFiles(newFiles: File[]): void
        replaceFiles(files: File[] | UploadFile[]): void
    }
}

export default forwardRef<UploaderRef, UploaderProps>(
    function UpupUploader(props, ref) {
        const providerValues = useUploaderController({
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
            uploadFiles: providerValues.uploadFiles,
            resetState: providerValues.resetState,
            replaceFiles: providerValues.replaceFiles,
        })

        useImperativeHandle(ref, () => ({
            useUpload: () => uploadApi,
        }))

        return (
            <UpupThemeProvider theme={props.theme}>
                <UploaderContextProvider value={providerValues}>
                    <div
                        className={`upup-scope upup-h-full upup-w-full ${providerValues.props.className ?? ''}`}
                        style={providerValues.props.style}
                        data-testid="upup-root"
                        data-upup-slot="root"
                        data-state={
                            providerValues.upload.uploadStatus?.toLowerCase() ??
                            'idle'
                        }
                        lang={providerValues.lang}
                        dir={providerValues.dir}
                    >
                        <div
                            className={cn('upup-w-full', {
                                'upup-h-[480px] upup-max-w-[600px]':
                                    !providerValues.props.mini,
                                'upup-h-auto upup-max-w-[280px]':
                                    providerValues.props.mini,
                            })}
                            style={
                                providerValues.props.mini
                                    ? { aspectRatio: '1 / 1' }
                                    : undefined
                            }
                        >
                            <section
                                data-testid="upup-container"
                                aria-labelledby="drop-instructions"
                                className={cn(
                                    `upup-panel-sheen upup-relative ${
                                        providerValues.theme.themeMode ===
                                        'dark'
                                            ? 'upup-panel-sheen-dark upup-bg-gradient-to-b upup-from-[#141b2e] upup-to-[#0a0e1a] upup-ring-1 upup-ring-white/10 upup-shadow-[0_24px_70px_-24px_rgba(2,6,23,0.85)]'
                                            : 'upup-bg-gradient-to-b upup-from-white upup-to-[#dde6f0] upup-ring-1 upup-ring-slate-200'
                                    } upup-flex upup-h-full upup-w-full upup-select-none upup-flex-col upup-gap-3 upup-overflow-hidden upup-rounded-2xl upup-px-5 upup-py-4`,
                                    {
                                        [providerValues.theme.slotOverrides
                                            .containerFull ?? '']:
                                            providerValues.theme.slotOverrides
                                                .containerFull &&
                                            !providerValues.props.mini,

                                        [providerValues.theme.slotOverrides
                                            .containerMini ?? '']:
                                            providerValues.theme.slotOverrides
                                                .containerMini &&
                                            providerValues.props.mini,
                                    },
                                )}
                            >
                                {providerValues.props.isProcessing && (
                                    <Icon
                                        name="loader"
                                        className={cn(
                                            'upup-absolute upup-right-5 upup-animate-spin upup-text-xs upup-leading-5 upup-text-[#0284c7] md:upup-text-xl',
                                            {
                                                'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                                    providerValues.theme
                                                        .themeMode === 'dark',
                                            },
                                        )}
                                    />
                                )}
                                <UploaderPanel />

                                {/* Inline image editor — overlays the uploader content */}
                                {providerValues.editingFile &&
                                    providerValues.props.imageEditor.display ===
                                        'inline' && (
                                        <Suspense
                                            fallback={
                                                <div className="upup-absolute upup-inset-0 upup-z-[9999] upup-flex upup-items-center upup-justify-center upup-bg-white/80 dark:upup-bg-black/60">
                                                    <DefaultLoaderIcon />
                                                </div>
                                            }
                                        >
                                            <ImageEditorInline
                                                file={
                                                    providerValues.editingFile
                                                }
                                                onClose={
                                                    providerValues.closeImageEditor
                                                }
                                                onSave={
                                                    providerValues.saveImageEdit
                                                }
                                            />
                                        </Suspense>
                                    )}

                                {/* Branding renders INSIDE UploaderPanel now,
                                    so the idle dashed frame wraps it. */}
                            </section>
                        </div>
                    </div>
                    {providerValues.editingFile &&
                        providerValues.props.imageEditor.display ===
                            'modal' && (
                            <Suspense
                                fallback={
                                    <div className="upup-scope upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/60">
                                        <DefaultLoaderIcon />
                                    </div>
                                }
                            >
                                <ImageEditorModal
                                    file={providerValues.editingFile}
                                    onClose={providerValues.closeImageEditor}
                                    onSave={providerValues.saveImageEdit}
                                />
                            </Suspense>
                        )}
                </UploaderContextProvider>
            </UpupThemeProvider>
        )
    },
)
