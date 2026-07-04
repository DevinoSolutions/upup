import type { UploadFile } from './upload-file'
import type { UploadStatus } from './upload-status'
import type { UploadResult } from '../contracts-strategies'
import type { CoreOptions } from '../core'

export interface CoreEvents {
    'state-change': {
        status?: UploadStatus
        error?: Error
        files?: Map<string, UploadFile>
        progress?: {
            totalFiles: number
            completedFiles: number
            percentage: number
        }
    }
    'upload-start': { retry?: boolean; fileId?: string }
    'file-upload-start': { file: UploadFile }
    'upload-progress': { fileId: string; loaded: number; total: number }
    'upload-success': { file: UploadFile; result: UploadResult }
    'upload-error': { error: Error; file?: UploadFile }
    'upload-all-complete': UploadFile[]
    'upload-pause': Record<string, never>
    'upload-resume': Record<string, never>
    'upload-cancel': Record<string, never>
    'files-added': UploadFile[]
    'file-removed': UploadFile
    'file-rejected': { count: number }
    'file-replaced': { file: UploadFile }
    'files-cleared': Record<string, never>
    'files-set': { count: number }
    'files-reordered': { fileIds: string[] }
    'restriction-failed': { error: unknown }
    'plugin-registered': { name: string }
    'options-updated': { partial: Partial<CoreOptions> }
    retry: { fileId: string }
    'snapshot-restored': { count: number; status: UploadStatus }
    'crash-recovery-restored': Record<string, never>
    destroyed: Record<string, never>
}
