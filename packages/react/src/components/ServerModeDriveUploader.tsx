import React, { useState } from 'react'
import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
} from '../context/UploaderContext'
import {
    useServerModeDrive,
    type ServerDriveFile,
    type ServerModeProvider,
} from '../hooks/useServerModeDrive'
import SourceViewContainer from './shared/SourceViewContainer'
import DriveAuthFallback from './shared/DriveAuthFallback'
import { errorCodeToMessageKey } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'

type Props = {
    provider: ServerModeProvider
    onBack?: () => void
    'data-upup-slot'?: string
}

const PROVIDER_LABEL: Record<ServerModeProvider, string> = {
    'google-drive': 'Google Drive',
    'one-drive': 'OneDrive',
    dropbox: 'Dropbox',
    box: 'Box',
}

export default function ServerModeDriveUploader({
    provider,
    onBack,
    'data-upup-slot': dataUpupSlot = `drive-browser-${provider}`,
}: Readonly<Props>): React.ReactElement | null {
    const { isDark: dark } = useUploaderTheme()
    const {
        icons: { LoaderIcon },
    } = useUploaderOptions()
    const { translator } = useUploaderI18n()
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
    const files: ServerDriveFile[] = state.status === 'ready' ? state.files : []

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
        <SourceViewContainer
            isLoading={isLoading}
            data-upup-slot={dataUpupSlot}
        >
            {isLoading ? (
                <LoaderIcon />
            ) : (
                <div
                    data-testid="upup-server-drive-browser"
                    className="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
                >
                    <div
                        className={cn(
                            'upup-flex upup-items-center upup-gap-2 upup-border-b upup-px-3 upup-py-2.5',
                            dark
                                ? 'upup-border-white/[0.06] upup-text-[#e2e8f0]'
                                : 'upup-border-black/[0.06] upup-text-gray-800',
                        )}
                        data-upup-slot="drive-browser-header"
                    >
                        <span className="upup-text-sm upup-font-medium">
                            {PROVIDER_LABEL[provider]}
                        </span>
                        <input
                            type="search"
                            name="upup-drive-search"
                            aria-label="Search"
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value)
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    void refresh({
                                        search: e.currentTarget.value,
                                    })
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
                    <div className="upup-overflow-auto upup-p-2">
                        {state.status === 'error' && (
                            <p
                                data-testid="upup-drive-error"
                                data-upup-slot="drive-error"
                                role="alert"
                                className={cn(
                                    'upup-p-4 upup-text-sm',
                                    dark
                                        ? 'upup-text-red-400'
                                        : 'upup-text-red-600',
                                )}
                            >
                                {state.code && translator
                                    ? translator(
                                          `errors.${errorCodeToMessageKey(state.code)}`,
                                          { code: state.code },
                                      )
                                    : state.message}
                            </p>
                        )}
                        {files.map(file => {
                            const isSelected = selected.has(file.id)
                            return (
                                <button
                                    key={file.id}
                                    type="button"
                                    onClick={() => {
                                        file.isFolder
                                            ? void refresh({
                                                  folderId: file.id,
                                              })
                                            : toggle(file.id)
                                    }}
                                    data-upup-slot="drive-browser-item"
                                    data-selected={isSelected}
                                    className={cn(
                                        // Panel-chrome row (states-tour-3 .st3-prow).
                                        'upup-fx-hover-lift upup-mb-1.5 upup-flex upup-w-full upup-items-center upup-gap-3 upup-rounded-[11px] upup-px-3 upup-py-2.5 upup-text-left upup-text-sm upup-ring-1',
                                        isSelected
                                            ? 'upup-bg-[#0ea5e9]/10 upup-ring-[#38bdf8]/35'
                                            : dark
                                              ? 'upup-bg-white/[0.04] upup-text-[#e2e8f0] upup-ring-white/[0.06] hover:upup-bg-white/[0.07]'
                                              : 'upup-bg-black/[0.03] upup-text-gray-800 upup-ring-black/[0.06] hover:upup-bg-black/[0.05]',
                                    )}
                                >
                                    <span
                                        className="upup-flex upup-h-[30px] upup-w-[30px] upup-flex-none upup-items-center upup-justify-center upup-rounded-[8px] upup-bg-white/[0.05]"
                                        aria-hidden="true"
                                    >
                                        {file.isFolder ? (
                                            <svg
                                                viewBox="0 0 24 24"
                                                width="17"
                                                height="17"
                                                fill="none"
                                                stroke="#38bdf8"
                                                strokeWidth="1.7"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            </svg>
                                        ) : (
                                            <svg
                                                viewBox="0 0 24 24"
                                                width="17"
                                                height="17"
                                                fill="none"
                                                stroke={
                                                    dark ? '#94a3b8' : '#64748b'
                                                }
                                                strokeWidth="1.6"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                                                <path d="M14 3v4h4" />
                                            </svg>
                                        )}
                                    </span>
                                    <span className="upup-flex-1 upup-truncate">
                                        {file.name}
                                    </span>
                                    {file.size != null && !file.isFolder && (
                                        <span className="upup-text-xs upup-opacity-60">
                                            {formatBytes(file.size)}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    <div
                        className={cn(
                            'upup-flex upup-items-center upup-justify-between upup-gap-2 upup-border-t upup-p-3',
                            dark
                                ? 'upup-border-white/[0.06]'
                                : 'upup-border-black/[0.06]',
                        )}
                    >
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
                            className="upup-fx-press upup-rounded-lg upup-bg-[#0ea5e9] upup-px-3 upup-py-1.5 upup-text-sm upup-font-medium upup-text-white hover:upup-bg-[#0284c7] disabled:upup-opacity-50"
                        >
                            {transferring
                                ? 'Uploading…'
                                : `Add files${selected.size ? ` (${selected.size})` : ''}`}
                        </button>
                    </div>
                </div>
            )}
        </SourceViewContainer>
    )
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
