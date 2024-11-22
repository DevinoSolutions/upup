import React, { FC, useCallback, useRef, useState } from 'react'
import { useUrl } from '../hooks'

import { motion } from 'framer-motion'
import { TbCameraRotate, TbCapture, TbX } from 'react-icons/tb'
import Webcam from 'react-webcam'

type Props = {
    setFiles: (files: any) => void
    setView: (view: string) => void
}

const CameraUploader: FC<Props> = ({ setFiles, setView }: Props) => {
    const webcamRef = useRef(null) as any
    const [imgSrc, setImgSrc] = useState('')
    const [url, setUrl] = useState('')
    const [cameraSide, setCameraSide] = useState<'environment' | 'user'>(
        'environment',
    )

    const { image, setTrigger, clearImage } = useUrl(url)

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot()
        setImgSrc(imageSrc) // show preview
        setUrl(imageSrc) // send to useUrl to convert to File
        setTrigger(true) // trigger conversion
    }, [webcamRef])

    return (
        <div className="grid w-[94%] grid-rows-[1fr,auto] justify-center">
            <div className="relative">
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        className="absolute rounded-xl border-2 border-[#272727]"
                    />
                ) : null}
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: cameraSide }}
                    className="h-max max-h-[24rem] rounded-xl"
                />

                {imgSrc && (
                    <>
                        <button
                            onClick={() => {
                                setImgSrc('')
                                setUrl('')
                                setTrigger(false)
                                clearImage()
                            }}
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
                    </>
                )}
            </div>
            <div className="flex gap-4">
                {!image ? (
                    <>
                        <button
                            className=" mt-2 flex w-1/3 flex-col items-center  justify-center rounded-md  bg-blue-500 p-2 text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700"
                            onClick={capture}
                            type="button"
                        >
                            <TbCapture />
                            Capture
                        </button>
                        <button
                            className="mt-2 flex w-1/3 flex-col items-center rounded-md bg-gray-500 p-2 text-white transition-all duration-300 hover:bg-gray-600  active:bg-blue-700"
                            onClick={() => {
                                setCameraSide(prevState =>
                                    prevState === 'environment'
                                        ? 'user'
                                        : 'environment',
                                )
                            }}
                            type="button"
                        >
                            <TbCameraRotate />
                            switch to{' '}
                            {cameraSide === 'environment' ? 'front' : 'back'}
                        </button>
                    </>
                ) : (
                    <button
                        className="mt-2 w-full rounded-md bg-blue-500 p-2 text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700"
                        onClick={() => {
                            setFiles((files: File[]) => [...files, image])
                            setView('internal')
                        }}
                        type="button"
                    >
                        Upload
                    </button>
                )}
            </div>
        </div>
    )
}

export default CameraUploader
