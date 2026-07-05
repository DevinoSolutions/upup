import { IUploaderContext } from '../context/UploaderContext'
import { isUploadActive } from '@upup/core/internal'

export default function useUpload({
    upload,
    files,
    setFiles,
    replaceFiles,
    uploadFiles,
    resetState,
}: Pick<
    IUploaderContext,
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
