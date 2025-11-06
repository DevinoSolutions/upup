import React from 'react'
import Webcam from 'react-webcam'
import useCameraUploader from '../hooks/useCameraUploader'
import { cn } from '../lib/tailwind'
import AdapterViewContainer from './shared/AdapterViewContainer'
import ShouldRender from './shared/ShouldRender'

export default function CameraUploader() {
    const {
        capture,
        handleFetchImage,
        clearUrl,
        handleCameraSwitch,
        newCameraSide,
        url,
        webcamRef,
        facingMode,
        props: {
            dark,
            classNames,
            icons: { CameraCaptureIcon, CameraDeleteIcon, CameraRotateIcon },
        },
    } = useCameraUploader()

    return (
        <AdapterViewContainer>
            <div className="upup-flex upup-h-full upup-w-full upup-flex-col upup-justify-center upup-overflow-auto upup-px-3 upup-py-2">
                <div className="upup-flex-1 upup-pt-10">
                    <ShouldRender if={!!url}>
                        <div
                            className={cn(
                                'upup-relative upup-aspect-video upup-bg-black/[0.025] upup-bg-contain upup-bg-center upup-bg-no-repeat upup-shadow-xl',
                                {
                                    'upup-bg-white/5 dark:upup-bg-white/5':
                                        dark,
                                },
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
                                <CameraDeleteIcon />
                            </button>
                        </div>
                    </ShouldRender>

                    <ShouldRender if={!url}>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode }}
                            className="upup-aspect-video upup-rounded-xl"
                        />
                    </ShouldRender>
                </div>
                <div className="upup-flex upup-gap-4">
                    <ShouldRender if={!url}>
                        <button
                            className={cn(
                                'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center  upup-justify-center upup-rounded-md  upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                                {
                                    'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]':
                                        dark,
                                },
                                classNames.cameraCaptureButton,
                            )}
                            onClick={capture}
                            type="button"
                        >
                            <span>
                                <CameraCaptureIcon />
                            </span>
                            <span>Capture</span>
                        </button>
                        <button
                            className={cn(
                                'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600',
                                classNames.cameraRotateButton,
                            )}
                            onClick={handleCameraSwitch}
                            type="button"
                        >
                            <span>
                                <CameraRotateIcon />
                            </span>
                            <span>switch to {newCameraSide}</span>
                        </button>
                    </ShouldRender>
                    <ShouldRender if={!!url}>
                        <button
                            className={cn(
                                'upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                                {
                                    'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]':
                                        dark,
                                },
                                classNames.cameraAddButton,
                            )}
                            onClick={handleFetchImage}
                            type="button"
                        >
                            Add Image
                        </button>
                    </ShouldRender>
                </div>
            </div>
        </AdapterViewContainer>
    )
}
