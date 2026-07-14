import type { UploadFile } from './upload-file'
import type { UploadStatus } from './upload-status'
import type { UploadResult } from '../contracts-strategies'
import type { CoreOptions } from '../core'
import type { FileSource } from './file-source'

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
    retry: { fileId?: string | undefined }
    'snapshot-restored': { count: number; status: UploadStatus }
    'crash-recovery-restored': Record<string, never>
    destroyed: Record<string, never>
    // ── UI-flow events (orchestrator/controller) ─────────────────────
    done: Record<string, never>
    'state-reset': Record<string, never>
    'auto-upload': { count: number }
    'connection-online': Record<string, never>
    'connection-offline': Record<string, never>
    // ── Image-editor lifecycle ───────────────────────────────────────
    'image-editor-open': { file: UploadFile }
    'image-editor-cancel': { file: UploadFile }
    'image-editor-save': { file: UploadFile; original: UploadFile }
    // ── Drag/drop + paste (DragDropController) ───────────────────────
    'drag-over': Record<string, never>
    'drag-leave': Record<string, never>
    drop: { files: File[] }
    'folder-drop-blocked': { acceptedFiles: number }
    paste: { files: File[] }
    // ── Pipeline diagnostics (PipelineEngine / steps via context.emit) ─
    'pipeline-start': { fileId: string; steps: string[] }
    'pipeline-step': { fileId: string; step: string }
    'pipeline-complete': { fileId: string }
    'pipeline-error': { scope: string; name: string; message: string }
    // ── UI telemetry (emitted by every framework port; react is the
    //    payload canon — a port that diverges fails its own typecheck) ──
    'source-click': { sourceId: FileSource }
    'source-view-cancel': { sourceId: FileSource | undefined }
    'browse-files': Record<string, never>
    'folder-select': { count: number }
    'url-submit': { url: string }
    'url-fetch': { file: File }
    'url-fetch-cancel': { url: string }
    'camera-capture': { dataUrl: string }
    'camera-confirm': { file: File }
    'file-preview-open': { fileId: string; fileName: string }
    'file-preview-close': { fileId: string; fileName: string }
}
