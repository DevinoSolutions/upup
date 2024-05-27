/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'

import { XhrHttpHandler } from '@aws-sdk/xhr-http-handler'

// add interface
interface ProgressHook {
    progress: number
    handler: XhrHttpHandler
}

const useProgress = (files: File[]): ProgressHook => {
    // handler can be a const because we do nt need to change it betwenn two render calls
    const handler = new XhrHttpHandler({})

    const [progress, setProgress] = useState<number>(0)
    useEffect(() => {
        const handleUploadProgress = (xhr: ProgressEvent) => {
            if (xhr.lengthComputable) {
                const newProgress = Math.round((xhr.loaded / xhr.total) * 100)
                setProgress(newProgress)

                if (newProgress === 100) {
                    handler.off(
                        XhrHttpHandler.EVENTS.UPLOAD_PROGRESS,
                        handleUploadProgress,
                    )
                }
            }
        }

        handler.on(XhrHttpHandler.EVENTS.UPLOAD_PROGRESS, handleUploadProgress)

        // Cleanup event listener on unmount or when `files` change
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
