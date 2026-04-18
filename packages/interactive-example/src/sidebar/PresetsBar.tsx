import React, { useContext } from 'react'
import { ConfigContext } from '../state/ConfigContext'
import type { UpupConfig } from '../types'

type Preset = {
    id: string
    label: string
    description: string
    config: UpupConfig
}

// Keep these snapshots lean — only the props that differ from defaults.
// Applying a preset replaces the current config entirely so the user sees
// the intended scenario without leftover state from earlier experiments.
const PRESETS: Preset[] = [
    {
        id: 'basic-images',
        label: 'Basic images',
        description: 'Images only, local + camera sources',
        config: {
            provider: 'aws',
            accept: 'image/*',
            maxFiles: 10,
            sources: ['local', 'camera'],
        },
    },
    {
        id: 'large-multipart',
        label: 'Large files (multipart)',
        description: 'Resumable multipart uploads, 5 GB limit',
        config: {
            provider: 'aws',
            maxFiles: 5,
            maxFileSize: { size: 5, unit: 'GB' },
            maxRetries: 5,
            resumable: { mode: 'multipart', chunkSizeBytes: 5_242_880 },
        } as UpupConfig,
    },
    {
        id: 'cloud-sources',
        label: 'Cloud sources',
        description: 'Google Drive, OneDrive, Dropbox',
        config: {
            provider: 'aws',
            maxFiles: 20,
            sources: ['local', 'google_drive', 'onedrive', 'dropbox'],
        },
    },
    {
        id: 'image-editor',
        label: 'Image editor (modal)',
        description: 'Opens the editor in a modal for each image',
        config: {
            provider: 'aws',
            accept: 'image/*',
            maxFiles: 5,
            sources: ['local', 'camera'],
            imageEditor: { enabled: true, display: 'modal', autoOpen: 'single' },
        } as UpupConfig,
    },
    {
        id: 'dark-theme',
        label: 'Dark theme',
        description: 'Force dark mode via theme.mode',
        config: {
            provider: 'aws',
            theme: { mode: 'dark' },
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
            <div className="upup-ie-presets-label">Try a preset</div>
            <div className="upup-ie-presets-row">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        className="upup-ie-preset"
                        title={preset.description}
                        onClick={() => apply(preset)}
                    >
                        {preset.label}
                    </button>
                ))}
                <button
                    type="button"
                    className="upup-ie-preset upup-ie-preset-reset"
                    title="Clear all configuration"
                    onClick={reset}
                >
                    Reset
                </button>
            </div>
        </div>
    )
}
