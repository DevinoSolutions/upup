import { IRootContext } from '../context/RootContext'
import { isUploadActive } from '@upup/core'

export default function useUpload({
    upload,
    files,
    setFiles,
    replaceFiles,
    uploadFiles,
    resetState,
}: Pick<
    IRootContext,
    | 'upload'
    | 'files'
    | 'setFiles'
    | 'replaceFiles'
    | 'resetState'
    | 'uploadFiles'
>) {
    const { startUpload, uploadStatus, uploadError, totalProgress } =
        upload || {}

    return {
        upload: startUpload,
        loading: isUploadActive(uploadStatus!),
        error: uploadError,
        progress: totalProgress,
        files: Array.from(files.values()).map(file => {
            return file
        }),
        setFiles,
        replaceFiles,
        uploadFiles,
        resetState,
    }
}
