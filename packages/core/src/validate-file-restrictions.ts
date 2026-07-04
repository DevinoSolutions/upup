import { UpupErrorCode, type MaxFileSizeObject } from './contracts'

export function fileSizeInBytes(size: MaxFileSizeObject): number {
    const units: Record<string, number> = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
    }
    return size.size * (units[size.unit] ?? 1)
}

export function matchesAccept(file: File, accept: string): boolean {
    const types = accept
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    if (
        types.length === 0 ||
        types.some(type => type === '*' || type === '*/*')
    ) {
        return true
    }

    return types.some(type => {
        if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', '/'))
        }
        if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase())
        }
        return file.type === type
    })
}

export interface FileRestrictionOptions {
    allowedFileTypes?: string
    maxFileSize?: MaxFileSizeObject
    minFileSize?: MaxFileSizeObject
}

export type FileRestrictionViolation = {
    code:
        | UpupErrorCode.TYPE_MISMATCH
        | UpupErrorCode.FILE_TOO_LARGE
        | UpupErrorCode.FILE_TOO_SMALL
    message: string
}

/**
 * Per-file restriction check shared by FileManager.validateFile (throws first)
 * and UpupCore.validateFiles (collects all). Violations are returned in the
 * order [type, max, min] — callers depend on this ordering.
 */
export function validateFileRestrictions(
    file: File,
    options: FileRestrictionOptions,
): FileRestrictionViolation[] {
    const errors: FileRestrictionViolation[] = []

    if (
        options.allowedFileTypes &&
        !matchesAccept(file, options.allowedFileTypes)
    ) {
        errors.push({
            code: UpupErrorCode.TYPE_MISMATCH,
            message: `File type "${file.type}" is not accepted`,
        })
    }

    if (options.maxFileSize) {
        const maxBytes = fileSizeInBytes(options.maxFileSize)
        if (file.size > maxBytes) {
            errors.push({
                code: UpupErrorCode.FILE_TOO_LARGE,
                message: `File "${file.name}" exceeds maximum size`,
            })
        }
    }

    if (options.minFileSize) {
        const minBytes = fileSizeInBytes(options.minFileSize)
        if (file.size < minBytes) {
            errors.push({
                code: UpupErrorCode.FILE_TOO_SMALL,
                message: `File "${file.name}" is below minimum size`,
            })
        }
    }

    return errors
}
