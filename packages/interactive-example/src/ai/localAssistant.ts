import type { UpupConfig } from '../types'
import type { AssistantPatchEvent } from './useMastraChat'

const DEFAULT_SOURCES = ['local', 'url', 'camera', 'microphone', 'screen'] as const

function withSources(...sources: string[]): UpupConfig {
    return {
        sources: [...new Set([...DEFAULT_SOURCES, ...sources])] as any,
    }
}

function size(size: number, unit: 'B' | 'KB' | 'MB' | 'GB') {
    return { size, unit }
}

const roundedSlots = {
    uploader: { container: 'rounded-2xl' },
    dropZone: { root: 'rounded-2xl' },
    sourceSelector: { adapterButton: 'rounded-xl' },
    filePreview: { root: 'rounded-xl' },
    fileList: { uploadButton: 'rounded-xl' },
}

function patch(explanation: string, config: UpupConfig): AssistantPatchEvent {
    return { explanation, patch: config }
}

export function getLocalAssistantPatch(input: string): AssistantPatchEvent | null {
    const text = input.toLowerCase().replace(/\s+/g, ' ').trim()
    const firstNumber = Number(text.match(/\b(\d+)\b/)?.[1])

    if (text.includes('photo') || text.includes('image')) {
        const limit = Number.isFinite(firstNumber) ? firstNumber : 10
        return patch('Configured image uploads with a per-file size limit.', {
            allowedFileTypes: 'images',
            maxFileSize: size(limit, 'MB') as any,
        })
    }

    if (text.includes('video')) {
        return patch('Limited uploads to video files.', { allowedFileTypes: 'videos' })
    }

    if (text.includes('audio')) {
        return patch('Limited uploads to audio files.', { allowedFileTypes: 'audio' })
    }

    if (text.includes('document')) {
        return patch('Limited uploads to document files.', { allowedFileTypes: 'documents' })
    }

    if (text.includes('google drive') && text.includes('dropbox')) {
        return patch('Enabled Google Drive and Dropbox sources.', withSources('googleDrive', 'dropbox'))
    }

    if (text.includes('onedrive') || text.includes('one drive')) {
        return patch('Enabled OneDrive as a source.', withSources('oneDrive'))
    }

    if (text.includes('camera') && (text.includes('only') || text.includes('no uploads'))) {
        return patch('Switched the source list to camera capture only.', { sources: ['camera'] as any })
    }

    if (text.includes('url') || text.includes('link')) {
        return patch('Enabled URL uploads.', withSources('url'))
    }

    if (text.includes('server mode')) {
        return patch('Switched to server mode using the default Upup API path.', {
            mode: 'server',
            serverUrl: '/api/upup',
        } as any)
    }

    if (text.includes('tus')) {
        return patch('Enabled tus resumable uploads.', {
            resumable: { protocol: 'tus', endpoint: '/api/upup-mock/tus' },
        } as any)
    }

    if (text.includes('hide') && text.includes('branding')) {
        return patch('Hid Upup branding.', { showBranding: false })
    }

    if (text.includes('french')) {
        return patch('Switched the UI locale to French.', { i18n: { locale: 'fr-FR' } } as any)
    }

    if (text.includes('retry')) {
        return patch('Updated upload retry count.', { maxRetries: Number.isFinite(firstNumber) ? firstNumber : 5 })
    }

    if (text.includes('max') && text.includes('file') && Number.isFinite(firstNumber)) {
        return patch('Updated the maximum file count.', { maxFiles: firstNumber })
    }

    if ((text.includes('bigger than') || text.includes('larger than')) && Number.isFinite(firstNumber)) {
        return patch('Updated the per-file size ceiling.', { maxFileSize: size(firstNumber, 'MB') as any })
    }

    if (text.includes('at least') && Number.isFinite(firstNumber)) {
        return patch('Updated the minimum file size.', { minFileSize: size(firstNumber, 'KB') as any })
    }

    if (text.includes('red')) {
        return patch('Changed the primary theme color to red.', {
            theme: { tokens: { color: { primary: '#dc2626' } } },
        } as any)
    }

    if (text.includes('dark') && text.includes('round')) {
        return patch('Enabled dark mode and rounded component slots.', {
            theme: { mode: 'dark', slots: roundedSlots },
        } as any)
    }

    if (text.includes('dark')) {
        return patch('Enabled dark mode.', { theme: { mode: 'dark' } } as any)
    }

    if (text.includes('round')) {
        return patch('Applied rounded component slots.', { theme: { slots: roundedSlots } } as any)
    }

    return null
}
