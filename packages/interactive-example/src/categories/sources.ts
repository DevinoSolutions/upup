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
            label: 'Folder sources',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    {
                        id: 'allowDrop',
                        label: 'Allow folder drag/drop',
                        description: 'Traverse directories when a user drops a folder onto the uploader.',
                        primitive: 'bool',
                        defaultValue: false,
                    },
                    {
                        id: 'showSelectFolderButton',
                        label: 'Show Select Folder button',
                        description: 'Show a Select Folder action in the My Device source.',
                        primitive: 'bool',
                        defaultValue: false,
                    },
                ],
            },
        },
    ],
}
