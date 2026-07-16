import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    useUploaderFiles,
    useUploaderSource,
    useUploaderTheme,
} from '../context/UploaderContext'
import { cn } from '@upupjs/core/internal'
import SourceViewContainer from './shared/SourceViewContainer'

type RecordingState = 'idle' | 'recording' | 'recorded'

export default function ScreenCaptureUploader(): React.ReactElement | null {
    const { setFiles } = useUploaderFiles()
    const { setActiveSource } = useUploaderSource()
    const { isDark: dark } = useUploaderTheme()

    const [state, setState] = useState<RecordingState>('idle')
    const [duration, setDuration] = useState(0)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const chunks = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const previewRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (videoUrl) URL.revokeObjectURL(videoUrl)
            streamRef.current?.getTracks().forEach(t => {
                t.stop()
            })
        }
    }, [videoUrl])

    const bindPreview = useCallback((el: HTMLVideoElement | null) => {
        previewRef.current = el
        if (el && streamRef.current) {
            el.srcObject = streamRef.current
            el.play()?.catch(() => {})
        }
    }, [])

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            })
            streamRef.current = stream
            chunks.current = []

            const videoTrack = stream.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.onended = () => {
                    if (
                        mediaRecorder.current &&
                        mediaRecorder.current.state !== 'inactive'
                    ) {
                        mediaRecorder.current.stop()
                    }
                    if (timerRef.current) clearInterval(timerRef.current)
                    setState('recorded')
                }
            }

            const recorder = new MediaRecorder(stream)
            mediaRecorder.current = recorder

            recorder.ondataavailable = e => {
                if (e.data.size > 0) chunks.current.push(e.data)
            }

            recorder.onstop = () => {
                const blob = new Blob(chunks.current, {
                    type: recorder.mimeType || 'video/webm',
                })
                setVideoUrl(URL.createObjectURL(blob))
                stream.getTracks().forEach(t => {
                    t.stop()
                })
                if (previewRef.current) previewRef.current.srcObject = null
            }

            recorder.start()
            setState('recording')
            setDuration(0)
            timerRef.current = setInterval(() => {
                setDuration(d => d + 1)
            }, 1000)
        } catch {
            // upup-catch: getDisplayMedia rejection (user cancelled / denied) is surfaced to the user via setError
            setError(
                'Screen sharing was cancelled or denied. Please try again.',
            )
        }
    }, [])

    const stopRecording = useCallback(() => {
        mediaRecorder.current?.stop()
        if (timerRef.current) clearInterval(timerRef.current)
        setState('recorded')
    }, [])

    const discardRecording = useCallback(() => {
        if (videoUrl) URL.revokeObjectURL(videoUrl)
        setVideoUrl(null)
        setDuration(0)
        setState('idle')
    }, [videoUrl])

    const addRecording = useCallback(() => {
        if (!videoUrl) return
        void fetch(videoUrl)
            .then(r => r.blob())
            .then(blob => {
                const file = new File(
                    [blob],
                    `screen-recording-${Date.now()}.webm`,
                    { type: blob.type },
                )
                setFiles([file])
                setActiveSource(undefined)
            })
            .catch(() => {
                // upup-catch: replaying an in-memory object URL cannot fail in practice; ignore
            })
    }, [videoUrl, setFiles, setActiveSource])

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
        const sec = s % 60
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    if (error) {
        return (
            <SourceViewContainer data-upup-slot="screen-capture-uploader">
                <div className="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center">
                    <p
                        className={cn('upup-text-sm upup-text-red-500', {
                            'upup-text-red-400': dark,
                        })}
                    >
                        {error}
                    </p>
                    <button
                        type="button"
                        className={cn(
                            'upup-rounded-lg upup-bg-[#0ea5e9] upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
                            {
                                'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
                                    dark,
                            },
                        )}
                        onClick={() => {
                            setError(null)
                            void startRecording()
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </SourceViewContainer>
        )
    }

    return (
        <SourceViewContainer data-upup-slot="screen-capture-uploader">
            <div className="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-4">
                {state === 'idle' && (
                    <div className="upup-flex upup-flex-col upup-items-center upup-gap-4">
                        <div
                            className={cn(
                                'upup-flex upup-h-20 upup-w-20 upup-items-center upup-justify-center upup-rounded-full upup-bg-[#0ea5e9]/20',
                            )}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={dark ? '#38bdf8' : '#0284c7'}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect
                                    width="20"
                                    height="15"
                                    x="2"
                                    y="3"
                                    rx="2"
                                />
                                <polyline points="8 21 16 21" />
                                <line x1="12" x2="12" y1="18" y2="21" />
                            </svg>
                        </div>
                        <button
                            type="button"
                            className={cn(
                                'upup-rounded-lg upup-bg-[#0ea5e9] upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-[#0284c7]',
                                {
                                    'upup-bg-[#38bdf8] hover:upup-bg-[#0ea5e9] dark:upup-bg-[#38bdf8]':
                                        dark,
                                },
                            )}
                            onClick={() => {
                                void startRecording()
                            }}
                        >
                            Share Screen
                        </button>
                    </div>
                )}

                {state === 'recording' && (
                    <>
                        <video
                            ref={bindPreview}
                            muted
                            className="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
                        />
                        <div className="upup-flex upup-items-center upup-gap-3">
                            <span className="upup-h-3 upup-w-3 upup-animate-pulse upup-rounded-full upup-bg-red-500" />
                            <span
                                className={cn(
                                    'upup-font-mono upup-text-lg upup-tabular-nums',
                                    {
                                        'upup-text-[#1b1b1b]': !dark,
                                        'upup-text-white': dark,
                                    },
                                )}
                            >
                                {formatTime(duration)}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
                            onClick={stopRecording}
                        >
                            Stop Recording
                        </button>
                    </>
                )}

                {state === 'recorded' && videoUrl && (
                    <>
                        <video
                            ref={videoRef}
                            controls
                            src={videoUrl}
                            className="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
                        />
                        <div className="upup-flex upup-gap-3">
                            <button
                                type="button"
                                className="upup-rounded-lg upup-bg-gray-500 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-gray-600"
                                onClick={discardRecording}
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                className={cn(
                                    'upup-rounded-lg upup-bg-[#0ea5e9] upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-[#0284c7]',
                                    {
                                        'upup-bg-[#38bdf8] hover:upup-bg-[#0ea5e9] dark:upup-bg-[#38bdf8]':
                                            dark,
                                    },
                                )}
                                onClick={addRecording}
                            >
                                Add Recording
                            </button>
                        </div>
                    </>
                )}
            </div>
        </SourceViewContainer>
    )
}
