import { MouseEventHandler, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { useRootContext } from '../context/RootContext'
import useFetchFileByUrl from './useFetchFileByUrl'

export enum FacingMode {
    Environment = 'environment',
    User = 'user',
}

export default function useCameraUploader() {
    const { setFiles, setActiveAdapter, props } = useRootContext()
    const { fetchImage } = useFetchFileByUrl()
    const webcamRef = useRef<Webcam>(null)
    const [url, setUrl] = useState('')
    const [facingMode, setFacingMode] = useState<FacingMode>(
        FacingMode.Environment,
    )
    const newCameraSide =
        facingMode === FacingMode.Environment ? 'front' : 'back'
    const clearUrl = () => setUrl('')

    const capture = async () => {
        const url = webcamRef.current?.getScreenshot()
        if (!url) return

        setUrl(url)
    }

    const handleFetchImage: MouseEventHandler<HTMLButtonElement> = async () => {
        const file = await fetchImage(url)
        if (file) {
            setFiles([file])
            setUrl('')
            setActiveAdapter(undefined)
        }
    }

    const handleCameraSwitch = () =>
        setFacingMode(prevState =>
            prevState === FacingMode.Environment
                ? FacingMode.User
                : FacingMode.Environment,
        )

    return {
        url,
        webcamRef,
        facingMode,
        capture,
        handleFetchImage,
        clearUrl,
        handleCameraSwitch,
        newCameraSide,
        props,
    }
}
