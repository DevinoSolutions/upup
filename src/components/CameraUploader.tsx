import { motion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
import { TbX } from 'react-icons/tb'
import Webcam from 'react-webcam'
import { useUrl } from 'hooks'

export default function CameraUploader({
    setFiles,
    setView,
}: {
    setFiles: (files: any) => void
    setView: (view: string) => void
}) {
    const webcamRef = useRef(null) as any
    const [imgSrc, setImgSrc] = useState('')
    const [url, setUrl] = useState('')

    const { image, setTrigger } = useUrl(url)

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
                    className="max-h-[24rem] h-max rounded-xl"
                />

                {imgSrc && (
                    <>
                        <button
                            onClick={() => setImgSrc('')}
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
                <button
                    className="bg-blue-500 text-white p-2 w-full mt-2 rounded-md hover:bg-blue-600 active:bg-blue-700 transition-all duration-300"
                    onClick={capture}
                    type="button"
                >
                    Capture photo
                </button>
                <button
                    className="bg-blue-500 text-white p-2 w-full mt-2 rounded-md hover:bg-blue-600 active:bg-blue-700 transition-all duration-300"
                    onClick={() => {
                        setFiles((files: File[]) => [...files, image])
                        setView('internal')
                    }}
                    disabled={!image}
                    type="button"
                >
                    Upload
                </button>
            </div>
        </div>
    )
}
