import type { CategoryDefinition } from '../types'

export const languageCategory: CategoryDefinition = {
    id: 'language',
    label: 'Language',
    description: 'Localization and RTL',
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
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'common.upload', label: 'common.upload', primitive: 'string', defaultValue: '' },
                    { id: 'common.cancel', label: 'common.cancel', primitive: 'string', defaultValue: '' },
                    { id: 'dropzone.label', label: 'dropzone.label', primitive: 'string', defaultValue: '' },
                    { id: 'header.filesSelected', label: 'header.filesSelected', primitive: 'string', defaultValue: '' },
                ],
            },
        },
    ],
}
