'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'

export default function useAudioUploader() {
    const { setFiles, setActiveSource, icons } = useUploaderContext()
    const [isRecording, setIsRecording] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [duration, setDuration] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const animationRef = useRef<number>(0)
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
    const audioBlobRef = useRef<Blob | null>(null)

    const drawWaveform = useCallback(() => {
        const analyser = analyserRef.current
        const canvas = canvasRef.current
        if (!analyser || !canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw)
            analyser.getByteTimeDomainData(dataArray)

            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            ctx.lineWidth = 2
            ctx.strokeStyle = '#8030a3'
            ctx.beginPath()

            const sliceWidth = canvas.width / bufferLength
            let x = 0

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0
                const y = (v * canvas.height) / 2

                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
                x += sliceWidth
            }

            ctx.lineTo(canvas.width, canvas.height / 2)
            ctx.stroke()
        }

        draw()
    }, [])

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })
            streamRef.current = stream

            const audioContext = new AudioContext()
            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 2048
            source.connect(analyser)
            analyserRef.current = analyser

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: 'audio/webm',
                })
                audioBlobRef.current = blob
                setAudioUrl(URL.createObjectURL(blob))
            }

            mediaRecorder.start()
            setIsRecording(true)
            setDuration(0)

            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

            drawWaveform()
        } catch (error) {
            // TODO: call onError once context exposes it (Task 3.8)
            console.error((error as Error).message)
        }
    }, [drawWaveform])

    const stopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop()
        streamRef.current?.getTracks().forEach(track => track.stop())
        cancelAnimationFrame(animationRef.current)
        clearInterval(timerRef.current)
        setIsRecording(false)
    }, [])

    const deleteRecording = useCallback(() => {
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
        audioBlobRef.current = null
        setDuration(0)
    }, [audioUrl])

    const handleAddAudio = useCallback(async () => {
        const blob = audioBlobRef.current
        if (!blob) return

        const file = new File([blob], `${crypto.randomUUID()}.webm`, {
            type: 'audio/webm',
        })
        await setFiles([file])
        setAudioUrl(null)
        audioBlobRef.current = null
        setActiveSource(null)
    }, [setFiles, setActiveSource])

    useEffect(() => {
        return () => {
            cancelAnimationFrame(animationRef.current)
            clearInterval(timerRef.current)
            streamRef.current?.getTracks().forEach(track => track.stop())
            if (audioUrl) URL.revokeObjectURL(audioUrl)
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
        audioUrl,
        duration,
        formattedDuration: formatDuration(duration),
        canvasRef,
        startRecording,
        stopRecording,
        deleteRecording,
        handleAddAudio,
        icons,
    }
}
