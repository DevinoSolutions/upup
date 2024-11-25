import { XhrHttpHandler } from '@aws-sdk/xhr-http-handler'
import { useCallback, useEffect, useState } from 'react'
import { BaseConfigs } from 'types'

const useProgress = (files: File[], baseConfigs?: BaseConfigs) => {
    const [progress, setProgress] = useState(0)
    const [completedFiles, setCompletedFiles] = useState(0)
    const [handler] = useState(new XhrHttpHandler({}) as any)

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
            setProgress(0)
            setCompletedFiles(0)
        }
    }, [files, handleUploadProgress])

    return {
        progress,
        handler,
        completedFiles,
    }
}

export default useProgress
