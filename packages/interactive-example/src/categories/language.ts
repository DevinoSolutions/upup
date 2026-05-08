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
            label: 'Message overrides (visible labels)',
            description: 'Replace the bundled copy on a per-key basis. Pick a tone preset to start, or type your own — everything else falls back to the active locale.',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    {
                        id: 'fileList.uploadFiles',
                        label: 'fileList.uploadFiles',
                        description: 'Label of the primary upload button.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'Upload {count, plural, one {# file} other {# files}}',
                            presets: [
                                { label: 'Friendly', value: 'Upload {count, plural, one {my file} other {my files}}' },
                                { label: 'Concise', value: 'Upload' },
                                { label: 'Action', value: 'Send now' },
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
                        id: 'dropzone.browseFiles',
                        label: 'dropzone.browseFiles',
                        description: 'Clickable browse label inside the empty drop zone.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'browse files',
                            presets: [
                                { label: 'Inviting', value: 'choose files' },
                                { label: 'Brief', value: 'browse' },
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
                            placeholder: '{count, plural, one {# file ready} other {# files ready}}',
                            presets: [
                                { label: 'Conversational', value: '{count, plural, one {# file ready to upload} other {# files ready to upload}}' },
                                { label: 'Status', value: '{count, plural, one {# selected} other {# selected}}' },
                                { label: 'Brief', value: '{count, plural, one {# file} other {# files}}' },
                            ],
                        },
                    },
                ],
            },
        },
    ],
}
