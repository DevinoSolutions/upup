import type { CategoryDefinition } from '../types'

export const processingCategory: CategoryDefinition = {
    id: 'processing',
    label: 'Processing',
    description: 'Pipeline steps before upload',
    entries: [
        {
            id: 'imageCompression',
            label: 'Compress images',
            description: 'Browser-side JPEG/WebP compression before upload',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'thumbnailGenerator',
            label: 'Generate thumbnails',
            description: 'Emit a lightweight preview alongside each image/video upload',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'checksumVerification',
            label: 'Checksum verification (SHA-256)',
            description: 'Compute SHA-256 and include it in the upload payload for integrity checks',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'heicConversion',
            label: 'HEIC → JPEG conversion',
            description: 'Convert Apple HEIC/HEIF to JPEG so non-Apple viewers can render them',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'stripExifData',
            label: 'Strip EXIF data',
            description: 'Remove camera/GPS metadata from images for privacy',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'contentDeduplication',
            label: 'Content deduplication',
            description: 'Skip duplicate files by hashing content on the client',
            primitive: 'bool',
            defaultValue: false,
        },
    ],
}
