import { IUploaderContext } from '../context/UploaderContext'
import type { UploadFile } from '@upup/core'
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
>): {
    upload: IUploaderContext['upload']['startUpload']
    loading: boolean
    error: IUploaderContext['upload']['uploadError']
    progress: number
    files: UploadFile[]
    setFiles: IUploaderContext['setFiles']
    replaceFiles: IUploaderContext['replaceFiles']
    uploadFiles: IUploaderContext['uploadFiles']
    resetState: IUploaderContext['resetState']
} {
    const { startUpload, uploadStatus, uploadError, totalProgress } =
        upload || {}

    return {
        upload: startUpload,
        loading: isUploadActive(uploadStatus),
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
