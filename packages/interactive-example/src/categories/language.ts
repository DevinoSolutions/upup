import type { CategoryDefinition } from '../types'
import { Languages } from 'lucide-react'

export const languageCategory: CategoryDefinition = {
    id: 'language',
    label: 'Language',
    description: 'Localization and RTL',
    icon: Languages,
    entries: [
        {
            id: 'i18n.locale',
            label: 'Locale',
            description: 'Active locale — controls all UI strings and text direction.',
            primitive: 'enum',
            defaultValue: 'en-US',
            options: {
                options: ['en-US', 'ar-SA', 'de-DE', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW'],
            },
        },
        {
            id: 'i18n.fallbackLocale',
            label: 'Fallback locale',
            description: 'Used when the active locale is missing a key.',
            primitive: 'enum',
            defaultValue: 'en-US',
            options: {
                options: ['en-US', 'ar-SA', 'de-DE', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW'],
            },
        },
        {
            id: 'i18n.overrides',
            label: 'Message overrides (common subset)',
            description: 'Replace the bundled copy on a per-key basis. Pick a tone preset to start, or type your own — everything else falls back to the active locale.',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    {
                        id: 'common.upload',
                        label: 'common.upload',
                        description: 'Label of the primary upload button.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'Upload',
                            presets: [
                                { label: 'Friendly', value: 'Upload my files' },
                                { label: 'Concise', value: 'Upload' },
                                { label: 'Action', value: 'Send' },
                            ],
                        },
                    },
                    {
                        id: 'common.cancel',
                        label: 'common.cancel',
                        description: 'Cancel/abort label across confirmation prompts.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'Cancel',
                            presets: [
                                { label: 'Standard', value: 'Cancel' },
                                { label: 'Casual', value: 'Nevermind' },
                                { label: 'Action', value: 'Stop' },
                            ],
                        },
                    },
                    {
                        id: 'dropzone.label',
                        label: 'dropzone.label',
                        description: 'Empty-state copy inside the drop zone before any files are added.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'Drop files here or click to browse',
                            presets: [
                                { label: 'Inviting', value: 'Drop files here or click to browse' },
                                { label: 'Brief', value: 'Drag files in' },
                                { label: 'Action', value: 'Add files' },
                            ],
                        },
                    },
                    {
                        id: 'header.filesSelected',
                        label: 'header.filesSelected',
                        description: 'Status header above the file list. Use {n} for the count.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: '{n} files ready to upload',
                            presets: [
                                { label: 'Conversational', value: '{n} files ready to upload' },
                                { label: 'Status', value: '{n} selected' },
                                { label: 'Brief', value: '{n} files' },
                            ],
                        },
                    },
                ],
            },
        },
    ],
}
