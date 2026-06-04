import { MouseEventHandler, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { FacingMode } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
} from '../context/RootContext'
import useFetchFileByUrl from './useFetchFileByUrl'

export { FacingMode }

export default function useCameraUploader() {
    const { core } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const { setActiveAdapter } = useUploaderSource()
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
    const clearUrl = () => setUrl('')

    const capture = async () => {
        const url = webcamRef.current?.getScreenshot()
        if (!url) return

        setUrl(url)
        core?.emit('camera-capture', { dataUrl: url })
    }

    const handleFetchImage: MouseEventHandler<HTMLButtonElement> = async () => {
        const file = await fetchImage(url)
        if (file) {
            setFiles([file])
            setUrl('')
            setActiveAdapter(undefined)
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
        theme,
    }
}
