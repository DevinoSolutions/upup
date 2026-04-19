import type { CategoryDefinition } from '../types'

export const uploadCategory: CategoryDefinition = {
    id: 'upload',
    label: 'Upload',
    description: 'Strategy and execution',
    entries: [
        {
            id: 'provider',
            label: 'Provider',
            description: 'Storage backend the uploader signs URLs for. All non-Azure options share one S3-compatible code path.',
            primitive: 'enum',
            defaultValue: 'aws',
            options: {
                options: ['aws', 'backblaze', 'digitalocean', 'r2', 'wasabi', 'minio', 'gcs', 'azure'],
                layout: 'segmented',
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
                        label: 'Chunk size (bytes)',
                        primitive: 'number',
                        defaultValue: 5_242_880,
                        options: { min: 1024, max: 104_857_600 },
                    },
                    {
                        id: 'endpoint',
                        label: 'tus endpoint (tus mode only)',
                        primitive: 'string',
                        defaultValue: '',
                        options: { placeholder: 'https://tus.example.com/files' },
                    },
                ],
            },
        },
    ],
}
