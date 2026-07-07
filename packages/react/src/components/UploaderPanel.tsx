import React from 'react'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
    useUploaderView,
} from '../context/UploaderContext'
import useUploaderPanel from '../hooks/useUploaderPanel'
import { cn } from '@upup/core/internal'
import SourceSelector from './SourceSelector'
import SourceView from './SourceView'
import FileList from './FileList'
export default function UploaderPanel(): React.ReactElement | null {
    const { files } = useUploaderFiles()
    const { activeSource } = useUploaderSource()
    const { isAddingMore } = useUploaderView()
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- inputRef is required for keyboard-activated file-picker DOM wiring; openFilePicker() alone can't focus the native input
    const { isOnline, inputRef, openFilePicker } = useUploaderRuntime()
    const { translations: tr } = useUploaderI18n()
    const { isDark: dark } = useUploaderTheme()
    const {
        isDragging,
        absoluteIsDragging,
        absoluteHasBorder,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handlePaste,
    } = useUploaderPanel()

    const dropEffectProps: React.AriaAttributes = {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- aria-dropeffect is intentionally set for drag-and-drop assistive-tech feedback; still honored by current screen readers
        'aria-dropeffect': isDragging ? 'copy' : 'none',
    }

    return (
        <div
            data-testid="upup-dropzone"
            data-upup-slot="uploader-panel"
            role="button"
            tabIndex={0}
            aria-label={tr.dropzoneLabel}
            {...dropEffectProps}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (inputRef.current) {
                        inputRef.current.removeAttribute('webkitdirectory')
                        inputRef.current.removeAttribute('directory')
                    }
                    openFilePicker()
                }
            }}
            className={cn(
                'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg',
                {
                    'upup-border upup-border-[#1849D6]': absoluteHasBorder,
                    'upup-border-[#30C5F7] dark:upup-border-[#30C5F7]':
                        absoluteHasBorder && dark,
                    'upup-border-dashed': !isDragging,
                    'upup-bg-[#E7ECFC] upup-backdrop-blur-sm':
                        absoluteIsDragging && !dark,
                    'upup-bg-[#045671] upup-backdrop-blur-sm dark:upup-bg-[#045671]':
                        absoluteIsDragging && dark,
                },
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
        >
            {!isOnline && (
                <div
                    className={cn(
                        'upup-absolute upup-inset-x-0 upup-top-0 upup-z-20 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
                        { 'upup-bg-yellow-600': dark },
                    )}
                >
                    No internet connection — uploads will resume when you
                    reconnect.
                </div>
            )}
            {!!activeSource && <SourceView />}
            {!activeSource && (isAddingMore || !files.size) && (
                <SourceSelector />
            )}
            <FileList />
        </div>
    )
}
