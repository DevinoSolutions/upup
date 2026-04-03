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
    const { setActiveSource, dark, classNames, t } = useUploaderContext()

    if (!user) return null

    return (
        <div>
            <div
                className={cn(
                    'upup-shadow-bottom upup-grid upup-grid-cols-[1fr,auto] upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
                    {
                        'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]':
                            dark,
                    },
                    classNames.driveHeader,
                )}
            >
                {!!path && (
                    <div className="upup-flex upup-items-center upup-gap-1">
                        {(path as Array<any>).map((p, i) => (
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
                                    maxWidth: 100 / path.length + '%',
                                    pointerEvents:
                                        i === path.length - 1
                                            ? 'none'
                                            : 'auto',
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
                        className={cn(
                            'upup-hover:upup-underline upup-text-blue-600',
                            {
                                'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                    dark,
                            },
                            classNames.driveLogoutButton,
                        )}
                        onClick={() => {
                            handleSignOut()
                            setActiveSource(null)
                        }}
                    >
                        {t('driveBrowser.logOut')}
                    </button>
                </div>
            </div>

            {showSearch && (
                <div
                    className={cn(
                        'upup-relative upup-h-fit upup-bg-black/[0.025] upup-px-3 upup-py-2',
                        {
                            'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]':
                                dark,
                        },
                        classNames.driveSearchContainer,
                    )}
                >
                    <input
                        type="search"
                        className={cn(
                            'upup-h-fit upup-w-full upup-rounded-md upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-pl-8 upup-text-xs upup-outline-none upup-transition-all upup-duration-300',
                            {
                                'upup-bg-white/5 upup-text-[#6D6D6D] dark:upup-bg-white/5 dark:upup-text-[#6D6D6D]':
                                    dark,
                            },
                            classNames.driveSearchInput,
                        )}
                        placeholder={t('driveBrowser.search')}
                        value={searchTerm}
                        onChange={(e) => onSearch(e.currentTarget.value)}
                    />
                    <TbSearch className="upup-absolute upup-left-5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]" />
                </div>
            )}
        </div>
    )
}
