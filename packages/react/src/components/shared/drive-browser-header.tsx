'use client'

import React, { Dispatch, SetStateAction } from 'react'
import { TbSearch, TbUser } from 'react-icons/tb'
import { useUploaderContext } from '../../context/uploader-context'
import { cn } from '../../lib/tailwind'
import type {
    GoogleRoot,
    OneDriveRoot,
    MicrosoftUser,
    GoogleUser,
} from '../../lib/google-drive-utils'

type Props = {
    path: GoogleRoot[] | OneDriveRoot[]
    setPath:
        | Dispatch<SetStateAction<GoogleRoot[]>>
        | Dispatch<SetStateAction<OneDriveRoot[]>>
    handleSignOut: () => Promise<void>
    showSearch: boolean
    searchTerm: string
    onSearch: Dispatch<SetStateAction<string>>
    user?: MicrosoftUser | GoogleUser
}

export default function DriveBrowserHeader({
    path,
    setPath,
    user,
    handleSignOut,
    showSearch,
    onSearch,
    searchTerm,
}: Readonly<Props>) {
    const { setActiveSource, t } = useUploaderContext()

    if (!user) return null

    return (
        <div>
            <div
                className="upup-shadow-bottom upup-grid upup-grid-cols-[1fr,auto] upup-px-3 upup-py-2 upup-text-xs upup-font-medium"
                style={{
                    backgroundColor: 'var(--upup-color-surface-alt)',
                    color: 'var(--upup-color-text)',
                }}
                data-upup-slot="driveBrowser.header"
            >
                {!!path && (
                    <div className="upup-flex upup-items-center upup-gap-1">
                        {(path as Array<any>).map((p, i) => (
                            <p
                                key={p.id}
                                className="upup-group upup-flex upup-shrink-0 upup-cursor-pointer upup-gap-1 upup-truncate"
                                style={{
                                    maxWidth: 100 / path.length + '%',
                                    pointerEvents:
                                        i === path.length - 1
                                            ? 'none'
                                            : 'auto',
                                    color: 'var(--upup-color-text-muted)',
                                }}
                                onClick={() =>
                                    (setPath as Dispatch<SetStateAction<any[]>>)(
                                        (prev: Array<any>) =>
                                            prev.slice(0, i + 1),
                                    )
                                }
                            >
                                <span className="upup-group-hover:upup-underline upup-truncate">
                                    {p.name}
                                </span>
                                {i !== path.length - 1 && <> &gt; </>}
                            </p>
                        ))}
                    </div>
                )}
                <div className="upup-flex upup-items-center upup-gap-2">
                    <div className="upup-relative upup-flex upup-h-8 upup-w-8 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full">
                        {user.picture ? (
                            <img
                                alt={user.name}
                                src={user.picture}
                                className="upup-bg-center upup-object-cover"
                            />
                        ) : (
                            <TbUser className="upup-text-xl" />
                        )}
                    </div>

                    <button
                        className="upup-hover:upup-underline"
                        style={{ color: 'var(--upup-color-primary)' }}
                        onClick={() => {
                            handleSignOut()
                            setActiveSource(null)
                        }}
                        data-upup-slot="driveBrowser.logoutButton"
                    >
                        {t('driveBrowser.logOut')}
                    </button>
                </div>
            </div>

            {showSearch && (
                <div
                    className="upup-relative upup-h-fit upup-px-3 upup-py-2"
                    style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                >
                    <input
                        type="search"
                        className="upup-h-fit upup-w-full upup-rounded-md upup-px-3 upup-py-2 upup-pl-8 upup-text-xs upup-outline-none upup-transition-all upup-duration-300"
                        style={{
                            backgroundColor: 'var(--upup-color-surface)',
                            color: 'var(--upup-color-text)',
                            borderColor: 'var(--upup-color-border)',
                        }}
                        placeholder={t('driveBrowser.search')}
                        value={searchTerm}
                        onChange={(e) => onSearch(e.currentTarget.value)}
                        data-upup-slot="driveBrowser.searchInput"
                    />
                    <TbSearch className="upup-absolute upup-left-5 upup-top-1/2 upup--translate-y-1/2" style={{ color: 'var(--upup-color-text-muted)' }} />
                </div>
            )}
        </div>
    )
}
