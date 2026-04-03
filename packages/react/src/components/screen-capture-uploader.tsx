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
        icons,
    } = useScreenCapture()

    const { ScreenCaptureStartIcon, ScreenCaptureStopIcon, ScreenCaptureDeleteIcon } = icons

    return (
        <div
            className="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-px-3 upup-py-4"
            data-upup-slot="screenCaptureUploader.root"
        >
            {/* Idle state */}
            {!isRecording && !videoUrl && (
                <div className="upup-flex upup-flex-1 upup-flex-col upup-items-center upup-justify-center upup-gap-4">
                    <button
                        className="upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-px-6 upup-py-4 upup-text-white upup-shadow-lg upup-transition-all upup-duration-300"
                        style={{ backgroundColor: 'var(--upup-color-primary)' }}
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
                        className="upup-max-h-48 upup-w-full upup-max-w-md upup-rounded-lg upup-shadow-md"
                        style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                        data-upup-slot="screenCaptureUploader.preview"
                    />
                    <span
                        className="upup-text-sm upup-font-medium"
                        style={{ color: 'var(--upup-color-danger)' }}
                    >
                        {t('screenCapture.screenRecording')} {formattedDuration}
                    </span>
                    <button
                        className="upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-bg-gray-700 upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-800"
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
                        className="upup-max-h-48 upup-w-full upup-max-w-md upup-rounded-lg upup-shadow-md"
                        style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                        data-upup-slot="screenCaptureUploader.preview"
                    />
                    <div className="upup-flex upup-gap-3">
                        <button
                            className="upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300"
                            style={{ backgroundColor: 'var(--upup-color-primary)' }}
                            onClick={handleAddScreenCapture}
                            type="button"
                            data-upup-slot="screenCaptureUploader.addButton"
                        >
                            {t('screenCapture.addScreenCapture')}
                        </button>
                        <button
                            className="upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300"
                            style={{ backgroundColor: 'var(--upup-color-danger)' }}
                            onClick={deleteRecording}
                            type="button"
                            data-upup-slot="screenCaptureUploader.deleteButton"
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
