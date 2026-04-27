import type { CategoryDefinition } from '../types'
import { Wand2 } from 'lucide-react'

export const processingCategory: CategoryDefinition = {
    id: 'processing',
    label: 'Processing',
    description: 'Pipeline steps before upload',
    icon: Wand2,
    intro: 'These run during file pickup. Toggle one, then pick or drop a file in the preview to see it fire — the sidebar update alone won\'t change anything visible until a file is added.',
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
