'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'
import AdapterViewContainer from './shared/AdapterViewContainer'

type RecordingState = 'idle' | 'recording' | 'recorded'

export default function AudioUploader() {
    const {
        setFiles,
        setActiveAdapter,
        props: { dark },
    } = useRootContext()

    const [state, setState] = useState<RecordingState>('idle')
    const [duration, setDuration] = useState(0)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const chunks = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (audioUrl) URL.revokeObjectURL(audioUrl)
            streamRef.current?.getTracks().forEach((t) => t.stop())
        }
    }, [audioUrl])

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })
            streamRef.current = stream
            chunks.current = []
            const recorder = new MediaRecorder(stream)
            mediaRecorder.current = recorder

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data)
            }

            recorder.onstop = () => {
                const blob = new Blob(chunks.current, {
                    type: recorder.mimeType || 'audio/webm',
                })
                setAudioUrl(URL.createObjectURL(blob))
                stream.getTracks().forEach((t) => t.stop())
            }

            recorder.start()
            setState('recording')
            setDuration(0)
            timerRef.current = setInterval(
                () => setDuration((d) => d + 1),
                1000,
            )
        } catch {
            setError(
                'Microphone access denied. Please allow microphone access and try again.',
            )
        }
    }, [])

    const stopRecording = useCallback(() => {
        mediaRecorder.current?.stop()
        if (timerRef.current) clearInterval(timerRef.current)
        setState('recorded')
    }, [])

    const discardRecording = useCallback(() => {
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
        setDuration(0)
        setState('idle')
    }, [audioUrl])

    const addRecording = useCallback(() => {
        if (!audioUrl) return
        const ext = mediaRecorder.current?.mimeType?.includes('webm')
            ? 'webm'
            : 'ogg'
        fetch(audioUrl)
            .then((r) => r.blob())
            .then((blob) => {
                const file = new File(
                    [blob],
                    `recording-${Date.now()}.${ext}`,
                    { type: blob.type },
                )
                setFiles([file])
                setActiveAdapter(undefined)
            })
    }, [audioUrl, setFiles, setActiveAdapter])

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
        const sec = s % 60
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    if (error) {
        return (
            <AdapterViewContainer data-upup-slot="audio-uploader">
                <div className="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center">
                    <p
                        className={cn('upup-text-sm upup-text-red-500', {
                            'upup-text-red-400': dark,
                        })}
                    >
                        {error}
                    </p>
                </div>
            </AdapterViewContainer>
        )
    }

    return (
        <AdapterViewContainer data-upup-slot="audio-uploader">
            <div className="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-6 upup-p-6">
                <div
                    className={cn(
                        'upup-flex upup-h-24 upup-w-24 upup-items-center upup-justify-center upup-rounded-full',
                        {
                            'upup-bg-red-500/20': state === 'recording',
                            'upup-bg-blue-500/20':
                                state === 'idle' || state === 'recorded',
                        },
                    )}
                >
                    <div
                        className={cn(
                            'upup-flex upup-h-16 upup-w-16 upup-items-center upup-justify-center upup-rounded-full upup-transition-all',
                            {
                                'upup-animate-pulse upup-bg-red-500':
                                    state === 'recording',
                                'upup-bg-blue-500':
                                    state === 'idle' || state === 'recorded',
                            },
                        )}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                    </div>
                </div>

                <span
                    className={cn(
                        'upup-text-2xl upup-font-mono upup-tabular-nums',
                        {
                            'upup-text-[#1b1b1b]': !dark,
                            'upup-text-white': dark,
                        },
                    )}
                >
                    {formatTime(duration)}
                </span>

                {state === 'recorded' && audioUrl && (
                    <audio
                        controls
                        src={audioUrl}
                        className="upup-w-full upup-max-w-xs"
                    />
                )}

                <div className="upup-flex upup-gap-3">
                    {state === 'idle' && (
                        <button
                            type="button"
                            className={cn(
                                'upup-rounded-lg upup-bg-blue-600 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700',
                                {
                                    'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]':
                                        dark,
                                },
                            )}
                            onClick={startRecording}
                        >
                            Start Recording
                        </button>
                    )}
                    {state === 'recording' && (
                        <button
                            type="button"
                            className="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
                            onClick={stopRecording}
                        >
                            Stop Recording
                        </button>
                    )}
                    {state === 'recorded' && (
                        <>
                            <button
                                type="button"
                                className={cn(
                                    'upup-rounded-lg upup-bg-gray-500 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-gray-600',
                                )}
                                onClick={discardRecording}
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                className={cn(
                                    'upup-rounded-lg upup-bg-blue-600 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700',
                                    {
                                        'upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]':
                                            dark,
                                    },
                                )}
                                onClick={addRecording}
                            >
                                Add Recording
                            </button>
                        </>
                    )}
                </div>
            </div>
        </AdapterViewContainer>
    )
}
