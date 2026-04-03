'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'

export default function useScreenCapture() {
    const { setFiles, setActiveSource, icons } = useUploaderContext()
    const [isRecording, setIsRecording] = useState(false)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [duration, setDuration] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const previewRef = useRef<HTMLVideoElement | null>(null)
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
    const videoBlobRef = useRef<Blob | null>(null)

    const stopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop()
        streamRef.current?.getTracks().forEach(track => track.stop())
        clearInterval(timerRef.current)
        setIsRecording(false)
    }, [])

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            })
            streamRef.current = stream

            // Show live preview
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: 'video/webm',
                })
                videoBlobRef.current = blob
                setVideoUrl(URL.createObjectURL(blob))
                if (videoRef.current) videoRef.current.srcObject = null
            }

            // Handle user clicking browser's "Stop sharing" button
            stream.getVideoTracks()[0].onended = () => {
                stopRecording()
            }

            mediaRecorder.start()
            setIsRecording(true)
            setDuration(0)

            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
        } catch (error) {
            // TODO: call onError once context exposes it (Task 3.8)
            console.error((error as Error).message)
        }
    }, [stopRecording])

    const deleteRecording = useCallback(() => {
        if (videoUrl) URL.revokeObjectURL(videoUrl)
        setVideoUrl(null)
        videoBlobRef.current = null
        setDuration(0)
    }, [videoUrl])

    const handleAddScreenCapture = useCallback(async () => {
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

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current)
            streamRef.current?.getTracks().forEach(track => track.stop())
            if (videoUrl) URL.revokeObjectURL(videoUrl)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    return {
        isRecording,
        videoUrl,
        duration,
        formattedDuration: formatDuration(duration),
        videoRef,
        previewRef,
        startRecording,
        stopRecording,
        deleteRecording,
        handleAddScreenCapture,
        icons,
    }
}
