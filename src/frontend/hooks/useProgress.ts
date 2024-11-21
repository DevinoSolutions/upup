import { XhrHttpHandler } from '@aws-sdk/xhr-http-handler'
import { useCallback, useEffect, useState } from 'react'

const useProgress = (files: File[]) => {
    const [progress, setProgress] = useState(0)
    const [handler] = useState(new XhrHttpHandler({}) as any)
    useEffect(() => {
        if (progress > 0) {
            console.log(
                progress === 100
                    ? '%cUPLOAD COMPLETE'
                    : `%cUpload Progress : ${progress}%`,
                `color: ${progress === 100 ? '#00ff00' : '#ff9600'}`,
            )
        }
        if (progress === 100) {
            handler.off(
                XhrHttpHandler.EVENTS.UPLOAD_PROGRESS,
                handleUploadProgress,
            )
        }
    }, [progress, files])

    const handleUploadProgress = useCallback((xhr: ProgressEvent) => {
        setProgress(Math.round((xhr.loaded / xhr.total) * 100))
    }, [])

    useEffect(() => {
        handler.on(XhrHttpHandler.EVENTS.UPLOAD_PROGRESS, handleUploadProgress)

        // Cleanup function to remove the event listener when component unmounts
        return () => {
            handler.off(
                XhrHttpHandler.EVENTS.UPLOAD_PROGRESS,
                handleUploadProgress,
            )
            setProgress(0)
        }
    }, [files])

    return {
        progress,
        handler,
    }
}

export default useProgress
