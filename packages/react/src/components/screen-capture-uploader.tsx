'use client'

import React from 'react'
import { cn } from '../lib/tailwind'
import useScreenCapture from '../hooks/use-screen-capture'
import { useUploaderContext } from '../context/uploader-context'

export default function ScreenCaptureUploader() {
    const { t } = useUploaderContext()
    const {
        isRecording,
        videoUrl,
        formattedDuration,
        videoRef,
        previewRef,
        startRecording,
        stopRecording,
        deleteRecording,
        handleAddScreenCapture,
        dark,
        classNames,
        icons,
    } = useScreenCapture()

    const { ScreenCaptureStartIcon, ScreenCaptureStopIcon, ScreenCaptureDeleteIcon } = icons

    return (
        <div
            className={cn(
                'upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-px-3 upup-py-4',
                classNames.screenCaptureContainer,
            )}
        >
            {/* Idle state */}
            {!isRecording && !videoUrl && (
                <div className="upup-flex upup-flex-1 upup-flex-col upup-items-center upup-justify-center upup-gap-4">
                    <button
                        className={cn(
                            'upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-bg-blue-600 upup-px-6 upup-py-4 upup-text-white upup-shadow-lg upup-transition-all upup-duration-300 hover:upup-bg-blue-700',
                            dark && 'upup-bg-[#59D1F9]',
                            classNames.screenCaptureStartButton,
                        )}
                        onClick={startRecording}
                        type="button"
                    >
                        {ScreenCaptureStartIcon && <ScreenCaptureStartIcon />}
                        <span>{t('screenCapture.startScreenCapture')}</span>
                    </button>
                </div>
            )}

            {/* Recording state */}
            {isRecording && (
                <div className="upup-flex upup-flex-1 upup-flex-col upup-items-center upup-justify-center upup-gap-4">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className={cn(
                            'upup-max-h-48 upup-w-full upup-max-w-md upup-rounded-lg upup-bg-black/5 upup-shadow-md',
                            dark && 'upup-bg-white/5',
                            classNames.screenCapturePreview,
                        )}
                    />
                    <span
                        className={cn(
                            'upup-text-sm upup-font-medium upup-text-red-500',
                            dark && 'upup-text-red-400',
                        )}
                    >
                        {t('screenCapture.screenRecording')} {formattedDuration}
                    </span>
                    <button
                        className={cn(
                            'upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-bg-gray-700 upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-800',
                            classNames.screenCaptureStopButton,
                        )}
                        onClick={stopRecording}
                        type="button"
                    >
                        {ScreenCaptureStopIcon && <ScreenCaptureStopIcon />}
                        <span>{t('screenCapture.stopScreenCapture')}</span>
                    </button>
                </div>
            )}

            {/* Preview state */}
            {!isRecording && !!videoUrl && (
                <div className="upup-flex upup-flex-1 upup-flex-col upup-items-center upup-justify-center upup-gap-4">
                    <video
                        ref={previewRef}
                        src={videoUrl ?? undefined}
                        controls
                        className={cn(
                            'upup-max-h-48 upup-w-full upup-max-w-md upup-rounded-lg upup-shadow-md',
                            dark && 'upup-bg-white/5',
                            classNames.screenCapturePreview,
                        )}
                    />
                    <div className="upup-flex upup-gap-3">
                        <button
                            className={cn(
                                'upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-blue-700',
                                dark && 'upup-bg-[#59D1F9]',
                                classNames.screenCaptureAddButton,
                            )}
                            onClick={handleAddScreenCapture}
                            type="button"
                        >
                            {t('screenCapture.addScreenCapture')}
                        </button>
                        <button
                            className={cn(
                                'upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-bg-red-500 upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-red-600',
                                classNames.screenCaptureDeleteButton,
                            )}
                            onClick={deleteRecording}
                            type="button"
                        >
                            {ScreenCaptureDeleteIcon && <ScreenCaptureDeleteIcon />}
                            <span>{t('screenCapture.deleteScreenCapture')}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
