import checkFileType from '../../../shared/lib/checkFileType'
import { UploadError, UploadErrorType } from '../../../shared/types/StorageSDK'
import { FileParams } from '../../types'

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB;

export default function fileValidateParams(file: FileParams) {
    // Validate required file params
    const requiredFileParams = ['name', 'type', 'size'] as const
    const missing = requiredFileParams.filter(key => !file[key])
    if (missing.length > 0)
        throw new UploadError(
            `Missing required file param: ${missing.join(', ')}`,
            UploadErrorType.FILE_VALIDATION_ERROR,
            false,
            400,
        )

    const {
        type: fileType,
        accept = '*',
        size,
        maxFileSize = DEFAULT_MAX_FILE_SIZE,
    } = file

    // Validate file type against accept pattern
    if (!checkFileType(accept, file as File))
        throw new UploadError(
            `File type ${fileType} not allowed. Accepted types: ${accept}`,
            UploadErrorType.FILE_VALIDATION_ERROR,
            false,
            400,
        )

    // Validate file size
    if (size > maxFileSize)
        throw new UploadError(
            `File size: ${size} exceeds maximum limit of ${
                maxFileSize / (1024 * 1024)
            }MB`,
            UploadErrorType.FILE_VALIDATION_ERROR,
            false,
            413,
        )
}
