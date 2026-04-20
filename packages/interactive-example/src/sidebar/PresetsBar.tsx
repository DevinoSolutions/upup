import React, { useContext } from 'react'
import { ConfigContext } from '../state/ConfigContext'
import type { UpupConfig } from '../types'

type PresetIcon = React.FC<{ className?: string }>

type Preset = {
    id: string
    label: string
    description: string
    icon: PresetIcon
    config: UpupConfig
}

const sw = 1.8

const PhotoIcon: PresetIcon = (p) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="2" />
        <path d="m3 17 5-4 4 3 4-5 5 6" />
    </svg>
)

const StackIcon: PresetIcon = (p) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
        <path d="M12 3 3 7l9 4 9-4-9-4Z" />
        <path d="m3 12 9 4 9-4" />
        <path d="m3 17 9 4 9-4" />
    </svg>
)

const CloudIcon: PresetIcon = (p) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
        <path d="M7 18a5 5 0 1 1 1.3-9.83 6 6 0 0 1 11.4 2.33A4 4 0 0 1 18 18H7Z" />
    </svg>
)

const EditIcon: PresetIcon = (p) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
    </svg>
)

const MoonIcon: PresetIcon = (p) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
)

const UndoIcon: PresetIcon = (p) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
    </svg>
)

const ServerIcon: PresetIcon = (p) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
        <rect x="3" y="4" width="18" height="6" rx="1" />
        <rect x="3" y="14" width="18" height="6" rx="1" />
        <path d="M7 7h.01M7 17h.01" />
    </svg>
)

// Keep snapshots lean — only the props that differ. Provider is left to
// whatever the user has chosen so presets don't clobber that setting.
const PRESETS: Preset[] = [
    {
        id: 'photos',
        label: 'Photos only',
        description: 'Accept images, browse from device or camera',
        icon: PhotoIcon,
        config: {
            accept: 'image/*',
            maxFiles: 10,
            sources: ['local', 'camera'],
        },
    },
    {
        id: 'big-uploads',
        label: 'Big uploads',
        description: 'Resumable chunked uploads up to 5 GB',
        icon: StackIcon,
        config: {
            maxFiles: 5,
            maxFileSize: { size: 5, unit: 'GB' },
            maxRetries: 5,
            resumable: { mode: 'multipart', chunkSizeBytes: 5_242_880 },
        } as UpupConfig,
    },
    {
        id: 'cloud',
        label: 'Cloud storage',
        description: 'Pull files from popular cloud drives',
        icon: CloudIcon,
        config: {
            maxFiles: 20,
            sources: ['local', 'google_drive', 'onedrive', 'dropbox'],
        },
    },
    {
        id: 'edit-photos',
        label: 'Edit before upload',
        description: 'Opens the built-in image editor per file',
        icon: EditIcon,
        config: {
            accept: 'image/*',
            maxFiles: 5,
            sources: ['local', 'camera'],
            imageEditor: { enabled: true, display: 'modal', autoOpen: 'single' },
        } as UpupConfig,
    },
    {
        id: 'dark',
        label: 'Dark mode',
        description: 'Force the dark theme',
        icon: MoonIcon,
        config: {
            theme: { mode: 'dark' },
        } as UpupConfig,
    },
    {
        id: 'server-mode',
        label: 'Server Mode',
        description: 'Proxy drives + storage through @upup/server — secrets stay on your backend',
        icon: ServerIcon,
        config: {
            mode: 'server',
            serverUrl: '/api/upup',
            sources: ['local', 'google_drive', 'onedrive', 'dropbox', 'box'],
        } as UpupConfig,
    },
]

export function PresetsBar() {
    const ctx = useContext(ConfigContext)
    if (!ctx) return null

    const apply = (preset: Preset) => ctx.setConfig({ ...preset.config })
    const reset = () => ctx.setConfig({})

    return (
        <div className="upup-ie-presets" role="group" aria-label="Configuration presets">
            <div className="upup-ie-presets-label">Quick start</div>
            <div className="upup-ie-presets-row">
                {PRESETS.map((preset) => {
                    const Icon = preset.icon
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            className="upup-ie-preset"
                            title={preset.description}
                            onClick={() => apply(preset)}
                        >
                            <Icon className="upup-ie-preset-icon" />
                            <span>{preset.label}</span>
                        </button>
                    )
                })}
                <button
                    type="button"
                    className="upup-ie-preset upup-ie-preset-reset"
                    title="Clear everything"
                    onClick={reset}
                >
                    <UndoIcon className="upup-ie-preset-icon" />
                    <span>Clear</span>
                </button>
            </div>
        </div>
    )
}
