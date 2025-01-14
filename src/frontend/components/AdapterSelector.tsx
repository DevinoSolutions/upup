import React from 'react'
import { UploadAdapter } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { uploadAdapterObject } from '../lib/constants'
import ShouldRender from './shared/ShouldRender'

const getH1ClassName = (mini: boolean) => {
    let className = 'text-center dark:text-white '
    className += !mini ? 'md:text-2xl' : ''

    return className
}

export default function AdapterSelector() {
    const {
        inputRef,
        setView,
        props: { onIntegrationClick, uploadAdapters, mini },
    } = useRootContext()
    const chosenAdapters = Object.values(uploadAdapterObject).filter(item =>
        uploadAdapters.includes(item.id),
    )
    const handleAdapterClick = (adapterId: UploadAdapter) => {
        onIntegrationClick(adapterId)
        if (adapterId === UploadAdapter.INTERNAL)
            inputRef && inputRef?.current?.click()
        else setView(adapterId)
    }

    return (
        <div
            className={
                !mini
                    ? 'flex h-full w-full flex-col items-center justify-center gap-6'
                    : ''
            }
        >
            <h1 className={getH1ClassName(mini)}>
                Drop your files here or{' '}
                <button
                    className="text-[#3782da] hover:underline"
                    onClick={() => inputRef && inputRef.current!.click()}
                    type="button"
                >
                    Click to browse
                </button>{' '}
                {!mini && <span>or import from:</span>}
            </h1>
            <ShouldRender if={!mini}>
                <div className="grid grid-cols-3 grid-rows-2 sm:grid-cols-4 md:grid-cols-6">
                    {chosenAdapters.map(({ Icon, id, name }) => (
                        <button
                            type="button"
                            key={id}
                            className="group relative mb-4 flex flex-col items-center justify-center gap-1 rounded-md p-2 px-4 text-sm transition-all duration-300 hover:bg-[#e9ecef] active:bg-[#dfe6f1] disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-[#282828] dark:active:bg-[#333]"
                            onKeyDown={e => {
                                if (e.key === 'Enter') e.preventDefault()
                            }}
                            onClick={() => handleAdapterClick(id)}
                        >
                            <span className="rounded-lg bg-white p-[6px] text-2xl shadow dark:bg-[#323232]">
                                <Icon />
                            </span>
                            <span className="text-[#525252] dark:text-[#777]">
                                {name}
                            </span>
                            <span className="absolute -bottom-2 hidden opacity-50 group-disabled:block">
                                (soon)
                            </span>
                        </button>
                    ))}
                </div>
            </ShouldRender>
        </div>
    )
}
