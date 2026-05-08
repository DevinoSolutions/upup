import type { CategoryDefinition } from '../types'
import { LayoutGrid } from 'lucide-react'

export const sourcesCategory: CategoryDefinition = {
    tier: 'simple',
    id: 'sources',
    label: 'Sources',
    description: 'Which sources are enabled',
    icon: LayoutGrid,
    entries: [
        {
            id: 'sources',
            label: 'Enabled sources',
            primitive: 'multi',
            defaultValue: [
                'local',
                'url',
                'camera',
                'microphone',
                'screen',
            ],
            options: {
                options: [
                    'local',
                    'googleDrive',
                    'oneDrive',
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
            id: 'folderUpload',
            label: 'Folder upload',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'enabled', label: 'Allow folders', primitive: 'bool', defaultValue: false },
                    { id: 'showPickerButton', label: 'Show folder button', primitive: 'bool', defaultValue: false },
                ],
            },
        },
    ],
}
