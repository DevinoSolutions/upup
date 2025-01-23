import { Dispatch, memo, SetStateAction, useEffect } from 'react'

export default memo(function FilePreviewUnsupported({
    previewIsUnsupported = false,
    onPreviewIsUnsupported,
}: {
    previewIsUnsupported?: boolean
    onPreviewIsUnsupported?: Dispatch<SetStateAction<boolean>>
}) {
    useEffect(() => {
        if (previewIsUnsupported) onPreviewIsUnsupported?.(true)
    }, [previewIsUnsupported, onPreviewIsUnsupported])

    return null
})
