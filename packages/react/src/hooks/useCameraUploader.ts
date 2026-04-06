'use client'
import { MouseEventHandler, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { useRootContext } from '../context/RootContext'
import useFetchFileByUrl from './useFetchFileByUrl'

export enum FacingMode {
    Environment = 'environment',
    User = 'user',
}

export default function useCameraUploader() {
    const { core, setFiles, setActiveAdapter, translations, props } = useRootContext()
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
        // v2: emit camera-capture event via UpupCore
        core?.emit('camera-capture', { dataUrl: url })
    }

    const handleFetchImage: MouseEventHandler<HTMLButtonElement> = async () => {
        const file = await fetchImage(url)
        if (file) {
            setFiles([file])
            setUrl('')
            setActiveAdapter(undefined)
            // v2: emit camera-confirm event via UpupCore when photo is accepted
            core?.emit('camera-confirm', { file })
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
        translations,
        props,
    }
}
