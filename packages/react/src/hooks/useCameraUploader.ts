import { MouseEventHandler, RefObject, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
    type ContextI18n,
    type ContextProps,
    type ContextTheme,
} from '../context/UploaderContext'
import useFetchFileByUrl from './useFetchFileByUrl'

export enum FacingMode {
    Environment = 'environment',
    User = 'user',
}

export default function useCameraUploader(): {
    url: string
    webcamRef: RefObject<Webcam | null>
    facingMode: FacingMode
    capture: () => void
    handleFetchImage: MouseEventHandler<HTMLButtonElement>
    clearUrl: () => void
    handleCameraSwitch: () => void
    newCameraSide: string
    translations: ContextI18n['translations']
    props: ContextProps
    theme: ContextTheme
} {
    const { core } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const { setActiveSource } = useUploaderSource()
    const { translations } = useUploaderI18n()
    const props = useUploaderOptions()
    const theme = useUploaderTheme()
    const { fetchImage } = useFetchFileByUrl()
    const webcamRef = useRef<Webcam>(null)
    const [url, setUrl] = useState('')
    const [facingMode, setFacingMode] = useState<FacingMode>(
        FacingMode.Environment,
    )
    const newCameraSide =
        facingMode === FacingMode.Environment ? 'front' : 'back'
    const clearUrl = () => {
        setUrl('')
    }

    const capture = () => {
        const url = webcamRef.current?.getScreenshot()
        if (!url) return

        setUrl(url)
        core?.emit('camera-capture', { dataUrl: url })
    }

    const handleFetchImage: MouseEventHandler<HTMLButtonElement> = () => {
        void (async () => {
            const file = await fetchImage(url)
            if (file) {
                setFiles([file])
                setUrl('')
                setActiveSource(undefined)
                core?.emit('camera-confirm', { file })
            }
        })()
    }

    const handleCameraSwitch = () => {
        setFacingMode(prevState =>
            prevState === FacingMode.Environment
                ? FacingMode.User
                : FacingMode.Environment,
        )
    }

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
        theme,
    }
}
