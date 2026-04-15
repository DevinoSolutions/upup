import type { CategoryDefinition } from '../types'

export const uploadCategory: CategoryDefinition = {
    id: 'upload',
    label: 'Upload',
    description: 'Strategy and execution',
    entries: [
        {
            id: 'provider',
            label: 'Provider',
            primitive: 'enum',
            defaultValue: 's3',
            options: { options: ['s3', 'backblaze', 'azure', 'digitalocean', 'aws'] },
        },
        {
            id: 'tokenEndpoint',
            label: 'Token endpoint',
            primitive: 'string',
            defaultValue: '',
            options: { placeholder: '/api/upload-token' },
        },
        {
            id: 'serverUrl',
            label: 'Server URL',
            primitive: 'string',
            defaultValue: '',
            options: { placeholder: '/api/upup' },
        },
        {
            id: 'apiKey',
            label: 'API key (managed mode)',
            primitive: 'string',
            defaultValue: '',
        },
        {
            id: 'uploadEndpoint',
            label: 'Upload endpoint',
            primitive: 'string',
            defaultValue: '',
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
    ],
}
