import React, { useState } from 'react'
import { useRootContext } from '../context/RootContext'
import {
    useServerModeDrive,
    type ServerDriveFile,
    type ServerModeProvider,
} from '../hooks/useServerModeDrive'
import AdapterViewContainer from './shared/AdapterViewContainer'
import DriveAuthFallback from './shared/DriveAuthFallback'
import ShouldRender from './shared/ShouldRender'
import { cn } from '../lib/tailwind'

type Props = {
    provider: ServerModeProvider
    onBack?: () => void
    'data-upup-slot'?: string
}

const PROVIDER_LABEL: Record<ServerModeProvider, string> = {
    'google-drive': 'Google Drive',
    'onedrive': 'OneDrive',
    'dropbox': 'Dropbox',
    'box': 'Box',
}

export default function ServerModeDriveUploader({
    provider,
    onBack,
    'data-upup-slot': dataUpupSlot = `drive-browser-${provider}`,
}: Readonly<Props>) {
    const {
        props: { dark },
    } = useRootContext()
    const { state, search, setSearch, refresh, transfer, startAuth } =
        useServerModeDrive(provider)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [transferring, setTransferring] = useState(false)

    if (state.status === 'reauth') {
        return (
            <DriveAuthFallback
                providerName={PROVIDER_LABEL[provider]}
                onRetry={startAuth}
            />
        )
    }

    const isLoading = state.status === 'loading' || state.status === 'idle'
    const files: ServerDriveFile[] =
        state.status === 'ready' ? state.files : []

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleTransfer = async () => {
        setTransferring(true)
        try {
            for (const file of files.filter(f => selected.has(f.id))) {
                const result = await transfer(file)
                if (result.status === 'reauth') {
                    startAuth()
                    return
                }
            }
            setSelected(new Set())
            onBack?.()
        } finally {
            setTransferring(false)
        }
    }

    return (
        <AdapterViewContainer
            isLoading={isLoading}
            data-upup-slot={dataUpupSlot}
        >
            <ShouldRender if={true} isLoading={isLoading}>
                <div
                    data-testid="upup-server-drive-browser"
                    className="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
                >
                    <div
                        className={cn(
                            'upup-flex upup-items-center upup-gap-2 upup-border-b upup-px-3 upup-py-2',
                            dark
                                ? 'upup-border-gray-700'
                                : 'upup-border-gray-200',
                        )}
                        data-upup-slot="drive-browser-header"
                    >
                        <span className="upup-text-sm upup-font-medium">
                            {PROVIDER_LABEL[provider]}
                        </span>
                        <input
                            type="search"
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value)
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    void refresh({ search: e.currentTarget.value })
                                }
                            }}
                            placeholder="Search…"
                            className={cn(
                                'upup-ml-auto upup-rounded upup-border upup-px-2 upup-py-1 upup-text-xs',
                                dark
                                    ? 'upup-border-gray-700 upup-bg-gray-800 upup-text-gray-100'
                                    : 'upup-border-gray-300 upup-bg-white',
                            )}
                        />
                    </div>
                    <div className="upup-overflow-auto">
                        {state.status === 'error' && (
                            <p
                                className={cn(
                                    'upup-p-4 upup-text-sm',
                                    dark
                                        ? 'upup-text-red-400'
                                        : 'upup-text-red-600',
                                )}
                            >
                                {state.message}
                            </p>
                        )}
                        {files.map(file => (
                            <button
                                key={file.id}
                                type="button"
                                onClick={() =>
                                    file.isFolder
                                        ? void refresh({ folderId: file.id })
                                        : toggle(file.id)
                                }
                                data-upup-slot="drive-browser-item"
                                data-selected={selected.has(file.id)}
                                className={cn(
                                    'upup-flex upup-w-full upup-items-center upup-gap-3 upup-border-b upup-px-4 upup-py-2 upup-text-left upup-text-sm',
                                    selected.has(file.id) &&
                                        'upup-bg-blue-50 dark:upup-bg-blue-900/30',
                                    dark
                                        ? 'upup-border-gray-700 upup-text-gray-100 hover:upup-bg-gray-700'
                                        : 'upup-border-gray-200 hover:upup-bg-gray-50',
                                )}
                            >
                                <span>{file.isFolder ? '📁' : '📄'}</span>
                                <span className="upup-flex-1 upup-truncate">
                                    {file.name}
                                </span>
                                {file.size != null && !file.isFolder && (
                                    <span className="upup-text-xs upup-opacity-60">
                                        {formatBytes(file.size)}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="upup-flex upup-items-center upup-justify-between upup-gap-2 upup-border-t upup-p-3">
                        <button
                            type="button"
                            onClick={onBack}
                            className="upup-text-sm upup-opacity-70 hover:upup-opacity-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={selected.size === 0 || transferring}
                            onClick={() => void handleTransfer()}
                            className="upup-rounded upup-bg-blue-600 upup-px-3 upup-py-1.5 upup-text-sm upup-text-white disabled:upup-opacity-50"
                        >
                            {transferring
                                ? 'Uploading…'
                                : `Add files${selected.size ? ` (${selected.size})` : ''}`}
                        </button>
                    </div>
                </div>
            </ShouldRender>
        </AdapterViewContainer>
    )
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
