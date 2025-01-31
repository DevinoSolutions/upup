import { motion } from 'framer-motion'
import React from 'react'
import { TbCameraRotate, TbCapture, TbX } from 'react-icons/tb'
import Webcam from 'react-webcam'
import useCameraUploader from '../hooks/useCameraUploader'
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
    } = useCameraUploader()

    return (
        <div className="grid w-[94%] grid-rows-[1fr,auto] justify-center">
            <div className="relative">
                <ShouldRender if={!!url}>
                    <img
                        src={url}
                        className="absolute rounded-xl border-2 border-[#272727]"
                    />
                </ShouldRender>
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode }}
                    className="h-max max-h-[24rem] rounded-xl"
                />

                <ShouldRender if={!!url}>
                    <button
                        onClick={clearUrl}
                        className="absolute -right-2 -top-2 z-10 rounded-full bg-[#272727] p-1 text-xl text-[#f5f5f5]"
                        type="button"
                    >
                        <TbX />
                    </button>
                    <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 rounded-xl bg-white"
                    />
                </ShouldRender>
            </div>
            <div className="flex gap-4">
                <ShouldRender if={!url}>
                    <button
                        className="mt-2 flex w-1/3 flex-col items-center  justify-center rounded-md  bg-blue-500 p-2 text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700"
                        onClick={capture}
                        type="button"
                    >
                        <span>
                            <TbCapture />
                        </span>
                        <span>Capture</span>
                    </button>
                    <button
                        className="mt-2 flex w-1/3 flex-col items-center rounded-md bg-gray-500 p-2 text-white transition-all duration-300 hover:bg-gray-600  active:bg-blue-700"
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
                        className="mt-2 w-full rounded-md bg-blue-500 p-2 text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700"
                        onClick={handleFetchImage}
                        type="button"
                    >
                        Upload
                    </button>
                </ShouldRender>
            </div>
        </div>
    )
}
