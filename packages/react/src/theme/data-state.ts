import { UploadStatus } from '@upup/shared'

export type UploaderDataState =
  | 'idle'
  | 'dragging'
  | 'uploading'
  | 'paused'
  | 'successful'
  | 'failed'

const STATUS_MAP: Record<UploadStatus, UploaderDataState> = {
  [UploadStatus.IDLE]: 'idle',
  [UploadStatus.PROCESSING]: 'idle',
  [UploadStatus.READY]: 'idle',
  [UploadStatus.UPLOADING]: 'uploading',
  [UploadStatus.PAUSED]: 'paused',
  [UploadStatus.SUCCESSFUL]: 'successful',
  [UploadStatus.FAILED]: 'failed',
}

/**
 * Derive the data-state attribute value for the uploader root element.
 * Dragging takes priority over upload status.
 */
export function deriveDataState(
  status: UploadStatus,
  isDragging: boolean,
): UploaderDataState {
  if (isDragging) return 'dragging'
  return STATUS_MAP[status] ?? 'idle'
}
