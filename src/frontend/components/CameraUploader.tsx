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
            <div className="flex h-full w-full flex-col justify-center overflow-auto px-3 py-2">
                <div className="flex-1 pt-10">
                    <ShouldRender if={!!url}>
                        <div
                            className={cn(
                                'relative aspect-video bg-black/[0.025] bg-contain bg-center bg-no-repeat  shadow-xl',
                                {
                                    'bg-white/5 dark:bg-white/5': dark,
                                },
                                classNames.cameraPreviewContainer,
                            )}
                            style={{ backgroundImage: `url(${url})` }}
                        >
                            <button
                                onClick={clearUrl}
                                className={cn(
                                    'absolute -right-2 -top-2 z-10 rounded-full bg-[#272727] p-1 text-xl text-[#f5f5f5]',
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
                            className="aspect-video rounded-xl"
                        />
                    </ShouldRender>
                </div>
                <div className="flex gap-4">
                    <ShouldRender if={!url}>
                        <button
                            className={cn(
                                'mt-2 flex w-1/3 flex-col items-center  justify-center rounded-md  bg-blue-600 p-2 text-white transition-all duration-300',
                                {
                                    'bg-[#59D1F9] dark:bg-[#59D1F9]': dark,
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
                                'mt-2 flex w-1/3 flex-col items-center rounded-md bg-gray-500 p-2 text-white transition-all duration-300 hover:bg-gray-600',
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
                                'mt-2 w-full rounded-md bg-blue-600 p-2 text-white transition-all duration-300',
                                {
                                    'bg-[#59D1F9] dark:bg-[#59D1F9]': dark,
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
