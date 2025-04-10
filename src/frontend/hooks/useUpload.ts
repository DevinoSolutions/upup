import { IRootContext, UploadStatus } from '../context/RootContext'

export default function useUpload({
    upload,
    files,
    setFiles,
    dynamicallyReplaceFiles,
    dynamicUpload,
}: Pick<
    IRootContext,
    | 'upload'
    | 'files'
    | 'setFiles'
    | 'dynamicallyReplaceFiles'
    | 'dynamicUpload'
>) {
    const { proceedUpload, uploadStatus, uploadError, totalProgress } =
        upload || {}

    return {
        upload: proceedUpload,
        loading: uploadStatus === UploadStatus.ONGOING,
        error: uploadError,
        progress: totalProgress,
        files: Array.from(files.values()).map(file => {
            return file
        }),
        setFiles,
        dynamicallyReplaceFiles,
        dynamicUpload,
    }
}
