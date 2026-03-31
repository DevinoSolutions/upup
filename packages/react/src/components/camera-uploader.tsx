'use client'

import React from 'react'
import Webcam from 'react-webcam'
import { t } from '@upup/shared'
import { cn } from '../lib/tailwind'
import useCameraUploader from '../hooks/use-camera-uploader'
import { useUploaderContext } from '../context/uploader-context'

export default function CameraUploader() {
    const { translations: tr } = useUploaderContext()
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
        dark,
        classNames,
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
                className={cn(
                    'upup-flex upup-gap-1 upup-rounded-lg upup-p-1',
                    dark ? 'upup-bg-gray-700' : 'upup-bg-gray-200',
                    classNames.cameraModeToggle,
                )}
            >
                <button
                    type="button"
                    className={cn(
                        'upup-flex-1 upup-rounded-md upup-py-1 upup-text-sm upup-font-medium upup-transition-all',
                        isPhoto
                            ? dark
                                ? 'upup-bg-gray-800 upup-text-white upup-shadow-sm'
                                : 'upup-bg-white upup-text-gray-900 upup-shadow-sm'
                            : dark
                              ? 'upup-text-gray-400 hover:upup-text-gray-300'
                              : 'upup-text-gray-500 hover:upup-text-gray-700',
                    )}
                    onClick={() => setMode('photo')}
                    disabled={isRecording}
                >
                    {tr.photo}
                </button>
                <button
                    type="button"
                    className={cn(
                        'upup-flex-1 upup-rounded-md upup-py-1 upup-text-sm upup-font-medium upup-transition-all',
                        isVideo
                            ? dark
                                ? 'upup-bg-gray-800 upup-text-white upup-shadow-sm'
                                : 'upup-bg-white upup-text-gray-900 upup-shadow-sm'
                            : dark
                              ? 'upup-text-gray-400 hover:upup-text-gray-300'
                              : 'upup-text-gray-500 hover:upup-text-gray-700',
                    )}
                    onClick={() => setMode('video')}
                    disabled={countdown !== null}
                >
                    {tr.video}
                </button>
            </div>

            <div className="upup-flex-1 upup-pt-4">
                {/* Photo mode: image preview */}
                {isPhoto && !!url && (
                    <div
                        className={cn(
                            'upup-relative upup-aspect-video upup-bg-contain upup-bg-center upup-bg-no-repeat upup-shadow-xl',
                            dark ? 'upup-bg-white/5' : 'upup-bg-black/[0.025]',
                            classNames.cameraPreviewContainer,
                        )}
                        style={{ backgroundImage: `url(${url})` }}
                    >
                        <button
                            onClick={clearUrl}
                            className={cn(
                                'upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]',
                                classNames.cameraDeleteButton,
                            )}
                            type="button"
                        >
                            {CameraDeleteIcon && <CameraDeleteIcon />}
                        </button>
                    </div>
                )}

                {/* Video mode: video preview */}
                {isVideo && !!videoUrl && !isRecording && (
                    <div
                        className={cn(
                            'upup-relative',
                            classNames.cameraVideoPreview,
                        )}
                    >
                        <video
                            ref={videoPreviewRef}
                            src={videoUrl ?? undefined}
                            controls
                            className="upup-aspect-video upup-w-full upup-rounded-xl"
                        />
                        <button
                            onClick={deleteVideoRecording}
                            className={cn(
                                'upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]',
                                classNames.cameraVideoDeleteButton,
                            )}
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
                                dark ? 'upup-bg-[#59D1F9]' : 'upup-bg-blue-600',
                                countdown !== null && 'upup-cursor-not-allowed upup-opacity-50',
                                classNames.cameraCaptureButton,
                            )}
                            onClick={capture}
                            disabled={countdown !== null}
                            type="button"
                        >
                            <span>{CameraCaptureIcon && <CameraCaptureIcon />}</span>
                            <span>{tr.capture}</span>
                        </button>
                        <button
                            className={cn(
                                'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600',
                                classNames.cameraRotateButton,
                            )}
                            onClick={handleCameraSwitch}
                            type="button"
                        >
                            <span>{CameraRotateIcon && <CameraRotateIcon />}</span>
                            <span>
                                {t(tr.switchToCamera, { side: newCameraSide === 'front' ? tr.front : tr.back })}
                            </span>
                        </button>
                        <button
                            className={cn(
                                'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600',
                                classNames.cameraMirrorButton,
                            )}
                            onClick={toggleMirror}
                            type="button"
                        >
                            <span>{CameraMirrorIcon && <CameraMirrorIcon />}</span>
                            <span>{tr.mirrorCamera}</span>
                        </button>
                    </>
                )}
                {isPhoto && !!url && (
                    <button
                        className={cn(
                            'upup-mt-2 upup-w-full upup-rounded-md upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                            dark ? 'upup-bg-[#59D1F9]' : 'upup-bg-blue-600',
                            classNames.cameraAddButton,
                        )}
                        onClick={handleFetchImage}
                        type="button"
                    >
                        {tr.addImage}
                    </button>
                )}

                {/* Video mode buttons */}
                {isVideo && !videoUrl && (
                    <>
                        {!isRecording ? (
                            <button
                                className={cn(
                                    'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-bg-red-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-red-700',
                                    classNames.cameraVideoRecordButton,
                                )}
                                onClick={startVideoRecording}
                                type="button"
                            >
                                <span>{CameraVideoRecordIcon && <CameraVideoRecordIcon />}</span>
                                <span>{tr.startVideoRecording}</span>
                            </button>
                        ) : (
                            <button
                                className={cn(
                                    'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-bg-gray-700 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-800',
                                    classNames.cameraVideoStopButton,
                                )}
                                onClick={stopVideoRecording}
                                type="button"
                            >
                                <span>{CameraVideoStopIcon && <CameraVideoStopIcon />}</span>
                                <span>{tr.stopVideoRecording}</span>
                            </button>
                        )}
                        <button
                            className={cn(
                                'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600',
                                classNames.cameraRotateButton,
                            )}
                            onClick={handleCameraSwitch}
                            disabled={isRecording}
                            type="button"
                        >
                            <span>{CameraRotateIcon && <CameraRotateIcon />}</span>
                            <span>
                                {t(tr.switchToCamera, { side: newCameraSide === 'front' ? tr.front : tr.back })}
                            </span>
                        </button>
                        <button
                            className={cn(
                                'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600',
                                classNames.cameraMirrorButton,
                            )}
                            onClick={toggleMirror}
                            disabled={isRecording}
                            type="button"
                        >
                            <span>{CameraMirrorIcon && <CameraMirrorIcon />}</span>
                            <span>{tr.mirrorCamera}</span>
                        </button>
                    </>
                )}
                {isVideo && !!videoUrl && !isRecording && (
                    <button
                        className={cn(
                            'upup-mt-2 upup-w-full upup-rounded-md upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                            dark ? 'upup-bg-[#59D1F9]' : 'upup-bg-blue-600',
                            classNames.cameraVideoAddButton,
                        )}
                        onClick={handleAddVideo}
                        type="button"
                    >
                        {tr.addVideo}
                    </button>
                )}
            </div>
        </div>
    )
}
