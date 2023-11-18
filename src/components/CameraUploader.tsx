import { FC, useCallback, useRef, useState } from 'react'
import { useUrl } from 'hooks'

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
        <div className="grid grid-rows-[1fr,auto] w-[94%] justify-center">
            <div className="relative">
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        className="rounded-xl border-2 border-[#272727] absolute"
                    />
                ) : null}
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: cameraSide }}
                    className="max-h-[24rem] h-max rounded-xl"
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
                            className="bg-[#272727] rounded-full absolute -top-2 -right-2 text-xl text-[#f5f5f5] p-1 z-10"
                            type="button"
                        >
                            <TbX />
                        </button>
                        <motion.div
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 bg-white rounded-xl"
                        />
                    </>
                )}
            </div>
            <div className="flex gap-4">
                {!image ? (
                    <>
                        <button
                            className="bg-blue-500 text-white p-2 flex flex-col items-center  justify-center  mt-2 rounded-md hover:bg-blue-600 active:bg-blue-700 transition-all duration-300 w-1/3"
                            onClick={capture}
                            type="button"
                        >
                            <TbCapture />
                            Capture
                        </button>
                        <button
                            className="bg-gray-500 text-white p-2 flex flex-col items-center mt-2 rounded-md hover:bg-gray-600 active:bg-blue-700 transition-all duration-300  w-1/3"
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
                        className="bg-blue-500 text-white p-2 w-full mt-2 rounded-md hover:bg-blue-600 active:bg-blue-700 transition-all duration-300"
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
