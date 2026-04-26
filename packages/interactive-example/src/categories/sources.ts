import type { CategoryDefinition } from '../types'
import { LayoutGrid } from 'lucide-react'

export const sourcesCategory: CategoryDefinition = {
    id: 'sources',
    label: 'Sources',
    description: 'Which adapters are enabled',
    icon: LayoutGrid,
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
            id: 'showSelectFolderButton',
            label: 'Show "Select folder" button',
            primitive: 'bool',
            defaultValue: false,
        },
    ],
}
