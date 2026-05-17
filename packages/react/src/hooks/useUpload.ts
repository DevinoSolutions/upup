import { IRootContext } from '../context/RootContext'
import { isUploadActive } from '../lib/status-helpers'

export default function useUpload({
    upload,
    files,
    setFiles,
    dynamicallyReplaceFiles,
    dynamicUpload,
    resetState,
}: Pick<
    IRootContext,
    | 'upload'
    | 'files'
    | 'setFiles'
    | 'dynamicallyReplaceFiles'
    | 'resetState'
    | 'dynamicUpload'
>) {
    const { proceedUpload, uploadStatus, uploadError, totalProgress } =
        upload || {}

    return {
        upload: proceedUpload,
        loading: isUploadActive(uploadStatus!),
        error: uploadError,
        progress: totalProgress,
        files: Array.from(files.values()).map(file => {
            return file
        }),
        setFiles,
        dynamicallyReplaceFiles,
        dynamicUpload,
        resetState,
    }
}
