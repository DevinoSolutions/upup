import { Root, User } from 'google'
import { MicrosoftUser, OneDriveRoot } from 'microsoft'
import React, { Dispatch, SetStateAction } from 'react'
import { TbSearch, TbUser } from 'react-icons/tb'
import { useRootContext } from '../../context/RootContext'
import { cn } from '../../lib/tailwind'
import ShouldRender from './ShouldRender'

type Props = {
    path: Root[] | OneDriveRoot[]
    setPath:
        | Dispatch<SetStateAction<Array<Root>>>
        | Dispatch<SetStateAction<Array<OneDriveRoot>>>
    handleSignOut: () => Promise<void>
    showSearch: boolean
    searchTerm: string
    onSearch: Dispatch<SetStateAction<string>>
    user?: MicrosoftUser | User
}

export default function DriveBrowserHeader({
    path,
    setPath,
    user,
    handleSignOut,
    showSearch,
    onSearch,
    searchTerm,
}: Props) {
    const {
        setActiveAdapter,
        props: { dark, classNames },
    } = useRootContext()

    if (!user) return null

    return (
        <div>
            <div
                className={cn(
                    'grid grid-cols-[1fr,auto] border-b border-[#e0e0e0] bg-[#fafafa] px-3 py-2 text-xs font-medium text-[#333]',
                    {
                        'border-[#6D6D6D] bg-[#1f1f1f] text-[#fafafa] dark:border-[#6D6D6D] dark:bg-[#1f1f1f] dark:text-[#fafafa]':
                            dark,
                    },
                )}
            >
                <ShouldRender if={!!path}>
                    <div className="flex items-center gap-1">
                        {(path as Array<any>).map((p, i) => (
                            <p
                                key={p.id}
                                className={cn(
                                    'group flex shrink-0 cursor-pointer gap-1 truncate',
                                    {
                                        'text-[#6D6D6D] dark:text-[#6D6D6D]':
                                            dark,
                                    },
                                )}
                                style={{
                                    maxWidth: 100 / path.length + '%',
                                    pointerEvents:
                                        i === path.length - 1 ? 'none' : 'auto',
                                }}
                                onClick={() =>
                                    setPath((prev: Array<any>) =>
                                        prev.slice(0, i + 1),
                                    )
                                }
                            >
                                <span className="truncate group-hover:underline">
                                    {p.name}
                                </span>
                                <ShouldRender if={i !== path.length - 1}>
                                    {' '}
                                    &gt;{' '}
                                </ShouldRender>
                            </p>
                        ))}
                    </div>
                </ShouldRender>
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            'relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f4f4f4]',
                            {
                                'bg-[#6D6D6D] dark:bg-[#6D6D6D]': dark,
                            },
                        )}
                    >
                        <ShouldRender if={!!user.picture}>
                            <img
                                src={user.picture}
                                className="bg-center object-cover"
                            />
                        </ShouldRender>
                        <ShouldRender if={!user.picture}>
                            <TbUser className="text-xl" />
                        </ShouldRender>
                    </div>

                    <button
                        className={cn(
                            'text-blue-600 hover:underline',
                            {
                                'text-[#30C5F7] dark:text-[#30C5F7]': dark,
                            },
                            classNames.driveLogoutButton,
                        )}
                        onClick={() => {
                            handleSignOut()
                            setActiveAdapter(undefined)
                        }}
                    >
                        Log out
                    </button>
                </div>
            </div>

            <ShouldRender if={showSearch}>
                <div
                    className={cn('relative h-fit bg-[#f4f4f4] px-3 py-2', {
                        'bg-[#1f1f1f] text-[#fafafa] dark:bg-[#1f1f1f] dark:text-[#fafafa]':
                            dark,
                    })}
                >
                    <input
                        type="search"
                        className={cn(
                            'h-fit w-full rounded-md bg-[#eaeaea] px-3 py-2 pl-8 text-xs outline-none transition-all duration-300',
                            {
                                'bg-[#2f2f2f] text-[#6D6D6D] dark:bg-[#2f2f2f] dark:text-[#6D6D6D]':
                                    dark,
                            },
                        )}
                        placeholder="Search"
                        value={searchTerm}
                        onChange={e => onSearch(e.currentTarget.value)}
                    />
                    <TbSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[#939393]" />
                </div>
            </ShouldRender>
        </div>
    )
}
