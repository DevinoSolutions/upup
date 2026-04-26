import type { CategoryDefinition } from '../types'
import { CLOUD_DRIVE_META } from '../icons/source-meta'
import { Server } from 'lucide-react'

/**
 * Opt-in integrations most visitors won't touch on a first look.
 * Endpoints, API keys, and cloud-drive client IDs live here so the
 * main categories stay focused on behaviour rather than credentials.
 */
export const advancedCategory: CategoryDefinition = {
    id: 'advanced',
    label: 'Advanced — self-host',
    description: 'Only needed if you run your own backend or cloud-drive app',
    icon: Server,
    entries: [
        {
            id: 'mode',
            label: 'Mode',
            description: 'Client = browser ↔ storage directly. Server = browser talks only to your @upup/server mount; server proxies drive APIs + storage writes.',
            primitive: 'enum',
            defaultValue: 'client',
            options: {
                options: ['client', 'server'],
                layout: 'segmented',
            },
        },
        {
            id: 'tokenEndpoint',
            label: 'Token endpoint',
            description: 'Client Mode only. Where the uploader POSTs to get a presigned URL.',
            primitive: 'string',
            defaultValue: '',
            options: { placeholder: '/api/upload-token' },
        },
        {
            id: 'serverUrl',
            label: 'Server URL',
            description: 'Server Mode: base path where @upup/server\'s createHandler() is mounted.',
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
            id: 'processingEndpoint',
            label: 'Processing endpoint (SSE)',
            description: 'After each upload, open an SSE stream at this URL; emits onFileProcessed when done',
            primitive: 'string',
            defaultValue: '',
            options: { placeholder: '/api/processing/status' },
        },
        {
            id: 'processingTimeout',
            label: 'Processing timeout (ms)',
            primitive: 'number',
            defaultValue: 60_000,
            options: { min: 1_000, max: 600_000 },
        },
        {
            id: 'enableAutoCorsConfig',
            label: 'Auto-configure S3 CORS',
            description: 'Auto-patch the bucket CORS on first use. Requires IAM permission on the backend.',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'cloudDrives.googleDrive',
            label: 'Google Drive',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                legendIcon: CLOUD_DRIVE_META.googleDrive.Icon,
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                    { id: 'apiKey', label: 'API Key', primitive: 'string', defaultValue: '' },
                    { id: 'appId', label: 'App ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'cloudDrives.oneDrive',
            label: 'OneDrive',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                legendIcon: CLOUD_DRIVE_META.oneDrive.Icon,
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'cloudDrives.dropbox',
            label: 'Dropbox',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                legendIcon: CLOUD_DRIVE_META.dropbox.Icon,
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'cloudDrives.box',
            label: 'Box',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                legendIcon: CLOUD_DRIVE_META.box.Icon,
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
    ],
}
