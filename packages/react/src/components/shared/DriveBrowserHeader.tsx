import React, { Dispatch, SetStateAction } from 'react'
import { type DriveFolder, type DriveUser } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
import Icon from '../Icon'
import {
    useUploaderI18n,
    useUploaderSource,
    useUploaderTheme,
} from '../../context/UploaderContext'

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

    if (!user) return null

    return (
        <div data-upup-slot="drive-browser-header">
            {/* One compact row on the panel gradient (no inner box):
                breadcrumb | search | avatar + log out. */}
            <div
                className={cn(
                    'upup-flex upup-items-center upup-gap-2.5 upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
                    { 'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]': dark },
                    slotClasses.driveHeader,
                )}
            >
                {!!path && (
                    <div className="upup-flex upup-min-w-0 upup-shrink upup-items-center upup-gap-1">
                        {path.map((p, i) => (
                            <p
                                key={p.id}
                                className={cn(
                                    'upup-group upup-flex upup-shrink-0 upup-cursor-pointer upup-gap-1 upup-truncate',
                                    {
                                        'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]':
                                            dark,
                                    },
                                )}
                                style={{
                                    maxWidth: `${100 / path.length}%`,
                                    pointerEvents:
                                        i === path.length - 1 ? 'none' : 'auto',
                                }}
                                onClick={() => {
                                    setPath(prev => prev.slice(0, i + 1))
                                }}
                            >
                                <span className="upup-group-hover:upup-underline upup-truncate">
                                    {p.name}
                                </span>
                                {i !== path.length - 1 && <> &gt; </>}
                            </p>
                        ))}
                    </div>
                )}
                {showSearch ? (
                    <div
                        className={cn(
                            'upup-relative upup-min-w-0 upup-flex-1',
                            slotClasses.driveSearchContainer,
                        )}
                    >
                        <input
                            type="search"
                            name="upup-drive-search"
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
                        />
                        <Icon
                            name="search"
                            className="upup-absolute upup-left-2.5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]"
                        />
                    </div>
                ) : (
                    <div className="upup-flex-1" />
                )}
                <div className="upup-flex upup-flex-none upup-items-center upup-gap-2">
                    <div className="upup-relative upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full">
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
                            'upup-hover:upup-underline upup-text-[#0284c7]',
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
                </div>
            </div>
        </div>
    )
}
