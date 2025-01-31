import { Root, User } from 'google'
import { MicrosoftUser, OneDriveRoot } from 'microsoft'
import React, { Dispatch, SetStateAction } from 'react'
import { TbSearch } from 'react-icons/tb'
import { UploadAdapter } from '../../../shared/types'
import { useRootContext } from '../../context/RootContext'
import ShouldRender from './ShouldRender'

type Props = {
    path: Root[] | OneDriveRoot[]
    setPath:
        | Dispatch<SetStateAction<Array<Root>>>
        | Dispatch<SetStateAction<Array<OneDriveRoot>>>
    user?: MicrosoftUser | User
    handleSignOut: () => Promise<void>
}

export default function DriveBrowserHeader({
    path,
    setPath,
    user,
    handleSignOut,
}: Props) {
    const { setView } = useRootContext()

    return (
        <>
            <div className="grid h-12 grid-cols-[minmax(0,1fr),auto] border-b bg-[#fafafa] p-2 text-xs font-medium text-[#333] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                <div className="flex gap-1 p-2 px-4">
                    <ShouldRender if={!!path}>
                        {(path as Array<any>).map((p, i) => (
                            <p
                                key={p.id}
                                className="group flex shrink-0 cursor-pointer gap-1 truncate"
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
                    </ShouldRender>
                </div>
                <div className="flex items-center gap-2">
                    <ShouldRender if={!!user}>{user?.name}</ShouldRender>
                    <i className="-mb-1 h-[3px] w-[3px] rounded-full bg-[#ddd]" />
                    <button
                        className="text-[#2275d7] hover:underline"
                        onClick={() => {
                            if (user) {
                                handleSignOut()
                                setView(UploadAdapter.INTERNAL)
                            }
                        }}
                    >
                        <ShouldRender if={!!user}>Log out</ShouldRender>
                        <ShouldRender if={!user}>Log in</ShouldRender>
                    </button>
                </div>
            </div>

            <div className="relative bg-white p-2  dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                <input
                    type="search"
                    className="h-8 w-full rounded-md bg-[#eaeaea] px-2 pl-8 text-xs outline-none transition-all duration-300 focus:bg-[#cfcfcf] dark:bg-[#2f2f2f] dark:text-[#fafafa]"
                    placeholder="Search"
                />
                <TbSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939393]" />
            </div>
        </>
    )
}
