import { FileSource } from '../contracts'
import { UploadStatus } from '../contracts'
import type { UploadFile } from '../contracts'
import { b64EncodeUnicode } from './encoder'

export const fileAppendParams = (file: File) => {
    const partial = file as Partial<UploadFile>
    const rel = partial.relativePath
        || (file as File & { webkitRelativePath?: string }).webkitRelativePath
        || file.name
    Object.assign(file, {
        id: partial.id || b64EncodeUnicode(rel),
        url: partial.url || URL.createObjectURL(file),
        source: partial.source || FileSource.LOCAL,
        status: partial.status || UploadStatus.READY,
        metadata: partial.metadata || {},
    })
    return file as UploadFile
}

export const revokeFileUrl = (file: UploadFile) => {
    if (file.url?.startsWith('blob:')) {
        URL.revokeObjectURL(file.url)
    }
}
