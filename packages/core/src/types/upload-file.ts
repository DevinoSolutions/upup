import { FileSource } from './file-source'
import { UploadStatus } from './upload-status'

export type UploadFileMetadata = {
    width?: number
    height?: number
    duration?: number
    thumbnailUrl?: string
    checksum?: string
    originalContentHash?: string
    originalSize?: number
    processedSize?: number
    compressed?: boolean
    exifStripped?: boolean
    /**
     * Set when `stripExifData` was requested but deliberately skipped, so the
     * file reached storage with its original metadata intact. Canvas has no
     * animated encoder, and animated WebP/APNG both carry EXIF — a
     * privacy-sensitive host needs to see that the strip did not happen so it
     * can branch server-side. Absent means nothing was skipped.
     */
    metadataStripSkipped?: boolean
    /** Why `metadataStripSkipped` was set. */
    metadataStripSkippedReason?: 'animated-image'
    heicConverted?: boolean
}

export type UploadFile = File & {
    id: string
    source: FileSource
    status: UploadStatus
    metadata: UploadFileMetadata
    url?: string
    relativePath?: string
    key?: string
    etag?: string
    /** @deprecated Use metadata.originalContentHash instead */
    fileHash?: string
    /** @deprecated Use metadata.checksum instead */
    checksumSHA256?: string
    /** @deprecated Use metadata.thumbnailUrl instead */
    thumbnail?: {
        file: File
        key?: string
    }
}

export type UploadFileWithProgress = UploadFile & { progress: number }
