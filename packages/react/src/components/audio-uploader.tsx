'use client'

import React from 'react'
import { cn } from '../lib/tailwind'
import useAudioUploader from '../hooks/use-audio-uploader'
import { useUploaderContext } from '../context/uploader-context'

export default function AudioUploader() {
    const { translations: tr } = useUploaderContext()
    const {
        isRecording,
        audioUrl,
        formattedDuration,
        canvasRef,
        startRecording,
        stopRecording,
        deleteRecording,
        handleAddAudio,
        dark,
        classNames,
        icons,
    } = useAudioUploader()

    const { AudioRecordIcon, AudioStopIcon, AudioDeleteIcon } = icons

    return (
        <div className="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-px-3 upup-py-4">
            {/* Idle state */}
            {!isRecording && !audioUrl && (
                <div className="upup-flex upup-flex-1 upup-flex-col upup-items-center upup-justify-center upup-gap-4">
                    <button
                        className={cn(
                            'upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-full upup-bg-red-500 upup-p-6 upup-text-white upup-shadow-lg upup-transition-all upup-duration-300 hover:upup-bg-red-600',
                            dark && 'upup-bg-red-600',
                            classNames.audioRecordButton,
                        )}
                        onClick={startRecording}
                        type="button"
                    >
                        {AudioRecordIcon && <AudioRecordIcon />}
                    </button>
                    <span
                        className={cn(
                            'upup-text-sm upup-text-gray-600',
                            dark && 'upup-text-gray-300',
                        )}
                    >
                        {tr.startRecording}
                    </span>
                </div>
            )}

            {/* Recording state */}
            {isRecording && (
                <div className="upup-flex upup-flex-1 upup-flex-col upup-items-center upup-justify-center upup-gap-4">
                    <canvas
                        ref={canvasRef}
                        width={300}
                        height={100}
                        className={cn(
                            'upup-rounded-lg upup-bg-black/5',
                            dark && 'upup-bg-white/5',
                            classNames.audioWaveform,
                        )}
                    />
                    <span
                        className={cn(
                            'upup-text-sm upup-font-medium upup-text-red-500',
                            dark && 'upup-text-red-400',
                        )}
                    >
                        {tr.recording} {formattedDuration}
                    </span>
                    <button
                        className={cn(
                            'upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-bg-gray-700 upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-800',
                            classNames.audioStopButton,
                        )}
                        onClick={stopRecording}
                        type="button"
                    >
                        {AudioStopIcon && <AudioStopIcon />}
                        <span>{tr.stopRecording}</span>
                    </button>
                </div>
            )}

            {/* Playback state */}
            {!isRecording && !!audioUrl && (
                <div className="upup-flex upup-flex-1 upup-flex-col upup-items-center upup-justify-center upup-gap-4">
                    <div
                        className={cn(
                            'upup-w-full upup-max-w-sm upup-rounded-lg upup-bg-black/5 upup-p-4',
                            dark && 'upup-bg-white/5',
                            classNames.audioPlaybackContainer,
                        )}
                    >
                        <audio
                            src={audioUrl ?? undefined}
                            controls
                            className="upup-w-full"
                        />
                    </div>
                    <div className="upup-flex upup-gap-3">
                        <button
                            className={cn(
                                'upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-blue-700',
                                dark && 'upup-bg-[#59D1F9]',
                                classNames.audioAddButton,
                            )}
                            onClick={handleAddAudio}
                            type="button"
                        >
                            {tr.addAudio}
                        </button>
                        <button
                            className={cn(
                                'upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-bg-red-500 upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-red-600',
                                classNames.audioDeleteButton,
                            )}
                            onClick={deleteRecording}
                            type="button"
                        >
                            {AudioDeleteIcon && <AudioDeleteIcon />}
                            <span>{tr.deleteRecording}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
