import type { CategoryDefinition } from '../types'

export const processingCategory: CategoryDefinition = {
    id: 'processing',
    label: 'Processing',
    description: 'Pipeline steps before upload',
    entries: [
        { id: 'shouldCompress', label: 'Compress generic files', primitive: 'bool', defaultValue: false },
        { id: 'imageCompression', label: 'Compress images', primitive: 'bool', defaultValue: false },
        { id: 'thumbnailGenerator', label: 'Generate thumbnails', primitive: 'bool', defaultValue: false },
        { id: 'checksumVerification', label: 'Checksum verification (SHA-256)', primitive: 'bool', defaultValue: false },
        { id: 'heicConversion', label: 'HEIC → JPEG conversion', primitive: 'bool', defaultValue: false },
        { id: 'stripExifData', label: 'Strip EXIF data', primitive: 'bool', defaultValue: false },
        { id: 'contentDeduplication', label: 'Content deduplication', primitive: 'bool', defaultValue: false },
    ],
}
