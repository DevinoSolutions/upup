'use client'

import {
    MouseEventHandler,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import Webcam from 'react-webcam'
import { useUploaderContext } from '../context/uploader-context'
import useFetchFileByUrl from './use-fetch-file-by-url'

export enum FacingMode {
    Environment = 'environment',
    User = 'user',
}

export type CameraMode = 'photo' | 'video'

export default function useCameraUploader() {
    const { setFiles, setActiveSource, resolvedTheme, icons } = useUploaderContext()
    const { fetchImage } = useFetchFileByUrl()
    const webcamRef = useRef<Webcam>(null)
    const [url, setUrl] = useState('')
    const [facingMode, setFacingMode] = useState<FacingMode>(
        FacingMode.Environment,
    )
    const [mirrored, setMirrored] = useState(false)
    const [countdown, setCountdown] = useState<number | null>(null)
    const [mode, setMode] = useState<CameraMode>('photo')

    // Video recording state
    const [isRecording, setIsRecording] = useState(false)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [videoDuration, setVideoDuration] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
    const videoBlobRef = useRef<Blob | null>(null)
    const videoPreviewRef = useRef<HTMLVideoElement | null>(null)

    const newCameraSide =
        facingMode === FacingMode.Environment ? 'front' : 'back'
    const clearUrl = () => setUrl('')

    // Countdown timer: ticks down each second, captures at 0
    useEffect(() => {
        if (countdown === null) return
        if (countdown === 0) {
            const screenshotUrl = webcamRef.current?.getScreenshot()
            if (screenshotUrl) setUrl(screenshotUrl)
            setCountdown(null)
            return
        }
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
        return () => clearTimeout(timer)
    }, [countdown])

    const capture = () => {
        if (countdown !== null) return
        setCountdown(3)
    }

    const handleFetchImage: MouseEventHandler<HTMLButtonElement> = async () => {
        const file = await fetchImage(url)
        if (file) {
            await setFiles([file])
            setUrl('')
            setActiveSource(null)
        }
    }

    const handleCameraSwitch = () =>
        setFacingMode(prevState =>
            prevState === FacingMode.Environment
                ? FacingMode.User
                : FacingMode.Environment,
        )

    const toggleMirror = useCallback(() => setMirrored(m => !m), [])

    // ── Video recording ───────────────────────────────────────
    const startVideoRecording = useCallback(() => {
        const stream = webcamRef.current?.stream
        if (!stream) return

        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = []

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' })
            videoBlobRef.current = blob
            setVideoUrl(URL.createObjectURL(blob))
        }

        mediaRecorder.start()
        setIsRecording(true)
        setVideoDuration(0)
        timerRef.current = setInterval(() => setVideoDuration(d => d + 1), 1000)
    }, [])

    const stopVideoRecording = useCallback(() => {
        mediaRecorderRef.current?.stop()
        clearInterval(timerRef.current)
        setIsRecording(false)
    }, [])

    const deleteVideoRecording = useCallback(() => {
        if (videoUrl) URL.revokeObjectURL(videoUrl)
        setVideoUrl(null)
        videoBlobRef.current = null
        setVideoDuration(0)
    }, [videoUrl])

    const handleAddVideo = useCallback(async () => {
        const blob = videoBlobRef.current
        if (!blob) return

        const file = new File([blob], `${crypto.randomUUID()}.webm`, {
            type: 'video/webm',
        })
        await setFiles([file])
        setVideoUrl(null)
        videoBlobRef.current = null
        setActiveSource(null)
    }, [setFiles, setActiveSource])

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    // Cleanup video resources on unmount
    useEffect(() => {
        return () => {
            clearInterval(timerRef.current)
            if (videoUrl) URL.revokeObjectURL(videoUrl)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return {
        url,
        webcamRef,
        facingMode,
        countdown,
        capture,
        handleFetchImage,
        clearUrl,
        handleCameraSwitch,
        newCameraSide,
        mirrored,
        toggleMirror,
        icons,
        // Video recording
        mode,
        setMode,
        isRecording,
        videoUrl,
        videoDuration,
        formattedDuration: formatDuration(videoDuration),
        videoPreviewRef,
        startVideoRecording,
        stopVideoRecording,
        deleteVideoRecording,
        handleAddVideo,
    }
}
