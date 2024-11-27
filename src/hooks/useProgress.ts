import { XhrHttpHandler } from '@aws-sdk/xhr-http-handler'
import { useCallback, useEffect, useState } from 'react'
import { BaseConfigs } from 'types'

const useProgress = (files: File[], baseConfigs?: BaseConfigs) => {
    const [progress, setProgress] = useState(0)
    const [completedFiles, setCompletedFiles] = useState(0)
    const [handler] = useState(() => {
        const h = new XhrHttpHandler({}) as any

        // Add abort event listener to the handler
        h.on('abort', () => {
            setProgress(0)
            setCompletedFiles(0)
            files.forEach(file => {
                baseConfigs?.onFileUploadFail?.(
                    file,
                    new Error('Upload cancelled'),
                )
            })
        })

        return h
    })

    const handleUploadProgress = useCallback(
        (xhr: ProgressEvent) => {
            const currentFileProgress = Math.round(
                (xhr.loaded / xhr.total) * 100,
            )
            setProgress(currentFileProgress)

            // Call individual file progress
            files.forEach(file => {
                baseConfigs?.onFileProgress?.(file, currentFileProgress)
            })

            // Calculate and report total progress
            if (currentFileProgress === 100) {
                setCompletedFiles(prev => {
                    const newCompleted = prev + 1
                    const totalProgress = Math.round(
                        (newCompleted / files.length) * 100,
                    )
                    baseConfigs?.onTotalUploadProgress?.(
                        totalProgress,
                        newCompleted,
                        files.length,
                    )
                    return newCompleted
                })
            }
        },
        [files, baseConfigs],
    )

    useEffect(() => {
        handler.on(XhrHttpHandler.EVENTS.UPLOAD_PROGRESS, handleUploadProgress)

        return () => {
            handler.off(
                XhrHttpHandler.EVENTS.UPLOAD_PROGRESS,
                handleUploadProgress,
            )
            handler.off('abort') // Clean up abort listener
            setProgress(0)
            setCompletedFiles(0)
        }
    }, [files, handleUploadProgress, handler])

    return {
        progress,
        handler,
        completedFiles,
    }
}

export default useProgress
