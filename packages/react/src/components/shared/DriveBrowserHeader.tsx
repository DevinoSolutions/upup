import React, {
    Dispatch,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import { createPortal } from 'react-dom'
import { type DriveFolder, type DriveUser } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
import Icon from '../Icon'
import {
    useUploaderI18n,
    useUploaderSource,
    useUploaderTheme,
} from '../../context/UploaderContext'
import { SourceViewHeaderExtraContext } from '../../context/SourceViewHeaderExtraContext'

type Props = {
    path: DriveFolder[]
    setPath: Dispatch<SetStateAction<DriveFolder[]>>
    handleSignOut: () => Promise<void>
    showSearch: boolean
    searchTerm: string
    onSearch: Dispatch<SetStateAction<string>>
    user?: DriveUser | undefined
    signIn?: (() => void) | undefined
}

export default function DriveBrowserHeader({
    path,
    setPath,
    user,
    handleSignOut,
    showSearch,
    onSearch,
    searchTerm,
}: Readonly<Props>): React.ReactElement | null {
    const { setActiveSource } = useUploaderSource()
    const { translations: tr } = useUploaderI18n()
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const headerExtraHost = useContext(SourceViewHeaderExtraContext)
    // Collapsed/expanded search lives here; the term itself stays in DriveBrowser.
    const [searchOpen, setSearchOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Focus the field the moment it expands.
    useEffect(() => {
        if (searchOpen) searchInputRef.current?.focus()
    }, [searchOpen])

    if (!user) return null

    // Once navigated into a folder we show a Back affordance + the current
    // folder name, not a full breadcrumb trail (long provider folder names
    // blew the row up, and multi-level jumps weren't worth the fragility).
    const navigated = path.length > 1
    const currentFolder = path[path.length - 1]
    const hasFilter = searchTerm.trim().length > 0

    const searchField = (expand: boolean): React.ReactElement => (
        <div
            className={cn(
                'upup-relative upup-min-w-0 upup-flex-1',
                expand && 'upup-fx-search-expand',
                slotClasses.driveSearchContainer,
            )}
        >
            <input
                ref={searchInputRef}
                type="search"
                name="upup-drive-search"
                data-testid="upup-drive-search-input"
                data-upup-slot="drive-search-input"
                aria-label={tr.search}
                className={cn(
                    'upup-w-full upup-rounded-lg upup-px-3 upup-py-1.5 upup-pl-8 upup-text-xs upup-outline-none upup-ring-1 upup-transition-shadow focus:upup-ring-2 focus:upup-ring-[#38bdf8]',
                    dark
                        ? 'upup-bg-white/[0.06] upup-text-[#e2e8f0] upup-ring-white/[0.1] placeholder:upup-text-[#64748b]'
                        : 'upup-bg-white upup-text-[#0f172a] upup-ring-black/[0.08] placeholder:upup-text-[#94a3b8]',
                    slotClasses.driveSearchInput,
                )}
                placeholder={tr.search}
                value={searchTerm}
                onChange={e => {
                    onSearch(e.currentTarget.value)
                }}
                onKeyDown={e => {
                    if (e.key === 'Escape') setSearchOpen(false)
                }}
                onBlur={() => {
                    // Collapse only when empty — a live filter must stay visible.
                    if (!searchTerm) setSearchOpen(false)
                }}
            />
            <Icon
                name="search"
                className="upup-absolute upup-left-2.5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]"
            />
        </div>
    )

    return (
        <div data-upup-slot="drive-browser-header">
            {/* Account controls live in the SourceView header row (portal),
                next to Back, separated by a hairline — not in their own strip. */}
            {!!headerExtraHost &&
                createPortal(
                    <>
                        <div className="upup-relative upup-flex upup-h-6 upup-w-6 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full">
                            {!!user.picture && (
                                <img
                                    alt={user.name}
                                    src={user.picture}
                                    className="upup-bg-center upup-object-cover"
                                />
                            )}
                            {!user.picture && (
                                <Icon name="user" className="upup-text-xl" />
                            )}
                        </div>
                        <button
                            className={cn(
                                'upup-hover:upup-underline upup-text-xs upup-font-medium upup-text-[#0284c7]',
                                {
                                    'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                        dark,
                                },
                                slotClasses.driveLogoutButton,
                            )}
                            onClick={() => {
                                void handleSignOut()
                                setActiveSource(undefined)
                            }}
                        >
                            {tr.logOut}
                        </button>
                        <span
                            aria-hidden="true"
                            className={cn(
                                'upup-h-4 upup-w-px',
                                dark ? 'upup-bg-white/15' : 'upup-bg-black/15',
                            )}
                        />
                    </>,
                    headerExtraHost,
                )}
            {(navigated || showSearch) && (
                <div
                    className={cn(
                        'upup-flex upup-items-center upup-gap-2.5 upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
                        {
                            'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]':
                                dark,
                        },
                        slotClasses.driveHeader,
                    )}
                >
                    {navigated ? (
                        <>
                            <button
                                type="button"
                                data-testid="upup-drive-back"
                                data-upup-slot="drive-back"
                                aria-label={tr.overlayBack}
                                onClick={() => {
                                    setPath(prev => prev.slice(0, -1))
                                }}
                                className={cn(
                                    'upup-fx-hover-lift upup-fx-press upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
                                    dark
                                        ? 'upup-text-[#e2e8f0] hover:upup-bg-white/[0.08]'
                                        : 'upup-text-[#334155] hover:upup-bg-black/[0.05]',
                                )}
                            >
                                <Icon name="chevron-left" />
                            </button>
                            {!searchOpen && (
                                <span
                                    data-upup-slot="drive-current-folder"
                                    title={currentFolder?.name}
                                    className="upup-min-w-0 upup-flex-1 upup-truncate upup-font-medium"
                                >
                                    {currentFolder?.name}
                                </span>
                            )}
                            {showSearch && !searchOpen && (
                                <button
                                    type="button"
                                    data-testid="upup-drive-search-toggle"
                                    data-upup-slot="drive-search-toggle"
                                    aria-label={tr.search}
                                    aria-expanded={false}
                                    onClick={() => {
                                        setSearchOpen(true)
                                    }}
                                    className={cn(
                                        'upup-fx-hover-lift upup-fx-press upup-ml-auto upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
                                        hasFilter
                                            ? 'upup-text-[#0ea5e9]'
                                            : dark
                                              ? 'upup-text-[#94a3b8] hover:upup-bg-white/[0.08]'
                                              : 'upup-text-[#64748b] hover:upup-bg-black/[0.05]',
                                    )}
                                >
                                    <Icon name="search" />
                                </button>
                            )}
                            {showSearch && searchOpen && searchField(true)}
                        </>
                    ) : (
                        showSearch && searchField(false)
                    )}
                </div>
            )}
        </div>
    )
}
