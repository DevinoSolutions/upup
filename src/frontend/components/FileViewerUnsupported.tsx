import { Dispatch, memo, SetStateAction, useEffect } from 'react'
import { FilePreviewStatus } from '../types/file'

export default memo(function FileViewerUnsupported({
    previewStatus,
    onSetPreviewStatus,
}: {
    previewStatus: FilePreviewStatus
    onSetPreviewStatus?: Dispatch<SetStateAction<FilePreviewStatus>>
}) {
    useEffect(() => {
        if (previewStatus !== FilePreviewStatus.Unsupported)
            onSetPreviewStatus?.(FilePreviewStatus.Unsupported)
    }, [previewStatus, onSetPreviewStatus])

    return null
})
