import React from 'react'
import { TbCameraRotate, TbCapture, TbX } from 'react-icons/tb'
import Webcam from 'react-webcam'
import useCameraUploader from '../hooks/useCameraUploader'
import { cn } from '../lib/tailwind'
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
        dark,
    } = useCameraUploader()

    return (
        <div className="flex h-full w-full flex-col justify-center overflow-auto px-3 py-2">
            <div className="relative flex-1 pt-10">
                <ShouldRender if={!!url}>
                    <div
                        className="aspect-video bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${url})` }}
                    />
                    <button
                        onClick={clearUrl}
                        className="absolute -right-2 -top-2 z-10 rounded-full bg-[#272727] p-1 text-xl text-[#f5f5f5]"
                        type="button"
                    >
                        <TbX />
                    </button>
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
                        )}
                        onClick={capture}
                        type="button"
                    >
                        <span>
                            <TbCapture />
                        </span>
                        <span>Capture</span>
                    </button>
                    <button
                        className="mt-2 flex w-1/3 flex-col items-center rounded-md bg-gray-500 p-2 text-white transition-all duration-300 hover:bg-gray-600"
                        onClick={handleCameraSwitch}
                        type="button"
                    >
                        <span>
                            <TbCameraRotate />
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
                        )}
                        onClick={handleFetchImage}
                        type="button"
                    >
                        Add Image
                    </button>
                </ShouldRender>
            </div>
        </div>
    )
}
