import type { CategoryDefinition } from '../types'

export const sourcesCategory: CategoryDefinition = {
    id: 'sources',
    label: 'Sources',
    description: 'Which adapters are enabled',
    entries: [
        {
            id: 'sources',
            label: 'Enabled sources',
            primitive: 'multi',
            defaultValue: [
                'local',
                'google_drive',
                'onedrive',
                'dropbox',
                'box',
                'url',
                'camera',
                'microphone',
                'screen',
            ],
            options: {
                options: [
                    'local',
                    'google_drive',
                    'onedrive',
                    'dropbox',
                    'box',
                    'url',
                    'camera',
                    'microphone',
                    'screen',
                ],
            },
        },
        {
            id: 'cloudDrives.googleDrive',
            label: 'Google Drive credentials',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                    { id: 'apiKey', label: 'API Key', primitive: 'string', defaultValue: '' },
                    { id: 'appId', label: 'App ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'cloudDrives.oneDrive',
            label: 'OneDrive credentials',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'cloudDrives.dropbox',
            label: 'Dropbox credentials',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'cloudDrives.box',
            label: 'Box credentials',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'showSelectFolderButton',
            label: 'Show "Select folder" button',
            primitive: 'bool',
            defaultValue: false,
        },
    ],
}
