'use client'

import React from 'react'
import Webcam from 'react-webcam'
import { cn } from '../lib/tailwind'
import useCameraUploader from '../hooks/use-camera-uploader'
import { useUploaderContext } from '../context/uploader-context'

export default function CameraUploader() {
    const { t } = useUploaderContext()
    const {
        capture,
        handleFetchImage,
        clearUrl,
        handleCameraSwitch,
        newCameraSide,
        mirrored,
        toggleMirror,
        url,
        webcamRef,
        facingMode,
        countdown,
        icons,
        // Video recording
        mode,
        setMode,
        isRecording,
        videoUrl,
        formattedDuration,
        videoPreviewRef,
        startVideoRecording,
        stopVideoRecording,
        deleteVideoRecording,
        handleAddVideo,
    } = useCameraUploader()

    const {
        CameraCaptureIcon,
        CameraDeleteIcon,
        CameraRotateIcon,
        CameraMirrorIcon,
        CameraVideoRecordIcon,
        CameraVideoStopIcon,
        CameraVideoDeleteIcon,
    } = icons

    const isPhoto = mode === 'photo'
    const isVideo = mode === 'video'

    return (
        <div className="upup-flex upup-h-full upup-w-full upup-flex-col upup-justify-center upup-overflow-auto upup-px-3 upup-py-2">
            {/* Photo / Video mode toggle */}
            <div
                className="upup-flex upup-gap-1 upup-rounded-lg upup-p-1"
                style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                data-upup-slot="cameraUploader.modeToggle"
            >
                <button
                    type="button"
                    className={cn(
                        'upup-flex-1 upup-rounded-md upup-py-1 upup-text-sm upup-font-medium upup-transition-all',
                        isPhoto
                            ? 'upup-shadow-sm'
                            : 'upup-opacity-60',
                    )}
                    style={{
                        backgroundColor: isPhoto ? 'var(--upup-color-surface)' : 'transparent',
                        color: isPhoto ? 'var(--upup-color-text)' : 'var(--upup-color-text-muted)',
                    }}
                    onClick={() => setMode('photo')}
                    disabled={isRecording}
                >
                    {t('camera.photo')}
                </button>
                <button
                    type="button"
                    className={cn(
                        'upup-flex-1 upup-rounded-md upup-py-1 upup-text-sm upup-font-medium upup-transition-all',
                        isVideo
                            ? 'upup-shadow-sm'
                            : 'upup-opacity-60',
                    )}
                    style={{
                        backgroundColor: isVideo ? 'var(--upup-color-surface)' : 'transparent',
                        color: isVideo ? 'var(--upup-color-text)' : 'var(--upup-color-text-muted)',
                    }}
                    onClick={() => setMode('video')}
                    disabled={countdown !== null}
                >
                    {t('camera.video')}
                </button>
            </div>

            <div className="upup-flex-1 upup-pt-4">
                {/* Photo mode: image preview */}
                {isPhoto && !!url && (
                    <div
                        className="upup-relative upup-aspect-video upup-bg-contain upup-bg-center upup-bg-no-repeat upup-shadow-xl"
                        style={{
                            backgroundImage: `url(${url})`,
                            backgroundColor: 'var(--upup-color-surface-alt)',
                        }}
                        data-upup-slot="cameraUploader.previewContainer"
                    >
                        <button
                            onClick={clearUrl}
                            className="upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]"
                            type="button"
                            data-upup-slot="cameraUploader.deleteButton"
                        >
                            {CameraDeleteIcon && <CameraDeleteIcon />}
                        </button>
                    </div>
                )}

                {/* Video mode: video preview */}
                {isVideo && !!videoUrl && !isRecording && (
                    <div
                        className="upup-relative"
                        data-upup-slot="cameraUploader.videoPreview"
                    >
                        <video
                            ref={videoPreviewRef}
                            src={videoUrl ?? undefined}
                            controls
                            className="upup-aspect-video upup-w-full upup-rounded-xl"
                        />
                        <button
                            onClick={deleteVideoRecording}
                            className="upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]"
                            type="button"
                        >
                            {CameraVideoDeleteIcon && <CameraVideoDeleteIcon />}
                        </button>
                    </div>
                )}

                {/* Webcam live view */}
                {((isPhoto && !url) || (isVideo && !videoUrl)) && (
                    <div className="upup-relative">
                        <Webcam
                            audio={isVideo}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            mirrored={mirrored}
                            videoConstraints={{ facingMode }}
                            className="upup-aspect-video upup-rounded-xl"
                        />
                        {/* Photo countdown overlay */}
                        {isPhoto && countdown !== null && (
                            <div className="upup-absolute upup-inset-0 upup-z-10 upup-flex upup-items-center upup-justify-center upup-rounded-xl upup-bg-black/50">
                                <span
                                    key={countdown}
                                    className="upup-text-8xl upup-font-bold upup-text-white"
                                >
                                    {countdown}
                                </span>
                            </div>
                        )}
                        {/* Video recording duration overlay */}
                        {isVideo && isRecording && (
                            <div className="upup-absolute upup-left-3 upup-top-3 upup-z-10 upup-flex upup-items-center upup-gap-2 upup-rounded-full upup-bg-black/60 upup-px-3 upup-py-1">
                                <span className="upup-inline-block upup-h-3 upup-w-3 upup-animate-pulse upup-rounded-full upup-bg-red-500" />
                                <span className="upup-font-mono upup-text-sm upup-text-white">
                                    {formattedDuration}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="upup-flex upup-gap-4">
                {/* Photo mode buttons */}
                {isPhoto && !url && (
                    <>
                        <button
                            className={cn(
                                'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                                countdown !== null && 'upup-cursor-not-allowed upup-opacity-50',
                            )}
                            style={{ backgroundColor: 'var(--upup-color-primary)' }}
                            onClick={capture}
                            disabled={countdown !== null}
                            type="button"
                            data-upup-slot="cameraUploader.captureButton"
                        >
                            <span>{CameraCaptureIcon && <CameraCaptureIcon />}</span>
                            <span>{t('camera.capture')}</span>
                        </button>
                        <button
                            className="upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600"
                            onClick={handleCameraSwitch}
                            type="button"
                            data-upup-slot="cameraUploader.rotateButton"
                        >
                            <span>{CameraRotateIcon && <CameraRotateIcon />}</span>
                            <span>
                                {t('camera.switchToCamera', { side: newCameraSide === 'front' ? t('camera.front') : t('camera.back') })}
                            </span>
                        </button>
                        <button
                            className="upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600"
                            onClick={toggleMirror}
                            type="button"
                            data-upup-slot="cameraUploader.mirrorButton"
                        >
                            <span>{CameraMirrorIcon && <CameraMirrorIcon />}</span>
                            <span>{t('camera.mirrorCamera')}</span>
                        </button>
                    </>
                )}
                {isPhoto && !!url && (
                    <button
                        className="upup-mt-2 upup-w-full upup-rounded-md upup-p-2 upup-text-white upup-transition-all upup-duration-300"
                        style={{ backgroundColor: 'var(--upup-color-primary)' }}
                        onClick={handleFetchImage}
                        type="button"
                        data-upup-slot="cameraUploader.addButton"
                    >
                        {t('camera.addImage')}
                    </button>
                )}

                {/* Video mode buttons */}
                {isVideo && !videoUrl && (
                    <>
                        {!isRecording ? (
                            <button
                                className="upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-bg-red-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-red-700"
                                onClick={startVideoRecording}
                                type="button"
                                data-upup-slot="cameraUploader.videoRecordButton"
                            >
                                <span>{CameraVideoRecordIcon && <CameraVideoRecordIcon />}</span>
                                <span>{t('camera.startVideoRecording')}</span>
                            </button>
                        ) : (
                            <button
                                className="upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-bg-gray-700 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-800"
                                onClick={stopVideoRecording}
                                type="button"
                                data-upup-slot="cameraUploader.videoStopButton"
                            >
                                <span>{CameraVideoStopIcon && <CameraVideoStopIcon />}</span>
                                <span>{t('camera.stopVideoRecording')}</span>
                            </button>
                        )}
                        <button
                            className="upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600"
                            onClick={handleCameraSwitch}
                            disabled={isRecording}
                            type="button"
                            data-upup-slot="cameraUploader.rotateButton"
                        >
                            <span>{CameraRotateIcon && <CameraRotateIcon />}</span>
                            <span>
                                {t('camera.switchToCamera', { side: newCameraSide === 'front' ? t('camera.front') : t('camera.back') })}
                            </span>
                        </button>
                        <button
                            className="upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600"
                            onClick={toggleMirror}
                            disabled={isRecording}
                            type="button"
                            data-upup-slot="cameraUploader.mirrorButton"
                        >
                            <span>{CameraMirrorIcon && <CameraMirrorIcon />}</span>
                            <span>{t('camera.mirrorCamera')}</span>
                        </button>
                    </>
                )}
                {isVideo && !!videoUrl && !isRecording && (
                    <button
                        className="upup-mt-2 upup-w-full upup-rounded-md upup-p-2 upup-text-white upup-transition-all upup-duration-300"
                        style={{ backgroundColor: 'var(--upup-color-primary)' }}
                        onClick={handleAddVideo}
                        type="button"
                        data-upup-slot="cameraUploader.videoAddButton"
                    >
                        {t('camera.addVideo')}
                    </button>
                )}
            </div>
        </div>
    )
}
