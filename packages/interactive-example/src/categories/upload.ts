import type { CategoryDefinition } from '../types'
import { Upload } from 'lucide-react'

export const uploadCategory: CategoryDefinition = {
    id: 'upload',
    label: 'Upload',
    description: 'Strategy and execution',
    icon: Upload,
    entries: [
        {
            id: 'provider',
            label: 'Provider',
            description: 'Storage backend the uploader signs URLs for. All non-Azure options share one S3-compatible code path.',
            primitive: 'enum',
            defaultValue: 'aws',
            options: {
                options: ['aws', 'gcs', 'azure', 'r2', 'digitalocean', 'backblaze', 'supabase', 'wasabi', 'minio', 'hetzner', 'linode', 'vultr', 'upcloud', 'scaleway', 'ovhcloud', 'alibaba', 'oracle', 'contabo', 'storj', 'idrive', 'ceph'],
                layout: 'segmented',
                expandAfter: 9,
            },
        },
        {
            id: 'maxConcurrentUploads',
            label: 'Max concurrent uploads',
            primitive: 'number',
            defaultValue: 3,
            options: { min: 1, max: 10 },
        },
        {
            id: 'maxRetries',
            label: 'Max retries',
            primitive: 'number',
            defaultValue: 3,
            options: { min: 0, max: 10 },
        },
        {
            id: 'autoUpload',
            label: 'Auto upload',
            description: 'Begin uploading immediately on file-add',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'crashRecovery',
            label: 'Crash recovery (IndexedDB)',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'resumable',
            label: 'Resumable uploads',
            description: 'Multipart or tus resumable upload config',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    {
                        id: 'mode',
                        label: 'Mode',
                        primitive: 'enum',
                        defaultValue: 'multipart',
                        options: {
                            options: ['multipart', 'tus'],
                            layout: 'segmented',
                        },
                    },
                    {
                        id: 'chunkSizeBytes',
                        label: 'Chunk size',
                        description: 'Each upload part is at most this big. 5–10 MB is a sensible default; larger chunks = fewer round-trips but more memory per file.',
                        primitive: 'size-unit',
                        defaultValue: 5_242_880,
                        options: { defaultSize: 5, defaultUnit: 'MB', serialize: 'bytes' },
                    },
                    {
                        id: 'endpoint',
                        label: 'tus endpoint',
                        description: 'URL of your tus server (only used when Mode = tus).',
                        primitive: 'string',
                        defaultValue: '',
                        options: { placeholder: 'https://tus.example.com/files' },
                        visibleWhen: { propId: 'resumable.mode', equals: 'tus' },
                    },
                ],
            },
        },
    ],
}
