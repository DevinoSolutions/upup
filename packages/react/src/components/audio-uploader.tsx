'use client'

import React from 'react'
import useAudioUploader from '../hooks/use-audio-uploader'
import { useUploaderContext } from '../context/uploader-context'

export default function AudioUploader() {
    const { t } = useUploaderContext()
    const {
        isRecording,
        audioUrl,
        formattedDuration,
        canvasRef,
        startRecording,
        stopRecording,
        deleteRecording,
        handleAddAudio,
        icons,
    } = useAudioUploader()

    const { AudioRecordIcon, AudioStopIcon, AudioDeleteIcon } = icons

    return (
        <div
            className="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-px-3 upup-py-4"
            data-upup-slot="audioUploader.root"
        >
            {/* Idle state */}
            {!isRecording && !audioUrl && (
                <div className="upup-flex upup-flex-1 upup-flex-col upup-items-center upup-justify-center upup-gap-4">
                    <button
                        className="upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-full upup-p-6 upup-text-white upup-shadow-lg upup-transition-all upup-duration-300"
                        style={{ backgroundColor: 'var(--upup-color-danger)' }}
                        onClick={startRecording}
                        type="button"
                    >
                        {AudioRecordIcon && <AudioRecordIcon />}
                    </button>
                    <span
                        className="upup-text-sm"
                        style={{ color: 'var(--upup-color-text-muted)' }}
                    >
                        {t('audio.startRecording')}
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
                        className="upup-rounded-lg"
                        style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                    />
                    <span
                        className="upup-text-sm upup-font-medium"
                        style={{ color: 'var(--upup-color-danger)' }}
                    >
                        {t('audio.recording')} {formattedDuration}
                    </span>
                    <button
                        className="upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-bg-gray-700 upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-800"
                        onClick={stopRecording}
                        type="button"
                    >
                        {AudioStopIcon && <AudioStopIcon />}
                        <span>{t('audio.stopRecording')}</span>
                    </button>
                </div>
            )}

            {/* Playback state */}
            {!isRecording && !!audioUrl && (
                <div className="upup-flex upup-flex-1 upup-flex-col upup-items-center upup-justify-center upup-gap-4">
                    <div
                        className="upup-w-full upup-max-w-sm upup-rounded-lg upup-p-4"
                        style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                        data-upup-slot="audioUploader.playbackContainer"
                    >
                        <audio
                            src={audioUrl ?? undefined}
                            controls
                            className="upup-w-full"
                        />
                    </div>
                    <div className="upup-flex upup-gap-3">
                        <button
                            className="upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300"
                            style={{ backgroundColor: 'var(--upup-color-primary)' }}
                            onClick={handleAddAudio}
                            type="button"
                            data-upup-slot="audioUploader.addButton"
                        >
                            {t('audio.addAudio')}
                        </button>
                        <button
                            className="upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-px-4 upup-py-2 upup-text-white upup-transition-all upup-duration-300"
                            style={{ backgroundColor: 'var(--upup-color-danger)' }}
                            onClick={deleteRecording}
                            type="button"
                            data-upup-slot="audioUploader.deleteButton"
                        >
                            {AudioDeleteIcon && <AudioDeleteIcon />}
                            <span>{t('audio.deleteRecording')}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
