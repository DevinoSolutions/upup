import React, { FC, MutableRefObject } from 'react'
import type { BaseConfigs, Method } from '../../types'

type Props = {
    setView: (view: string) => void
    inputRef?: MutableRefObject<HTMLInputElement | null>
    methods: Method[]
    baseConfigs?: BaseConfigs
}

const MethodsSelector: FC<Props> = ({
    setView,
    inputRef,
    methods,
    baseConfigs,
}: Props) => {
    const handleMethodClick = (methodId: string) => {
        baseConfigs?.onIntegrationClick?.(methodId)
        if (methodId === 'INTERNAL') inputRef && inputRef?.current?.click()
        else setView(methodId)
    }

    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-6">
            <h1 className="text-center dark:text-white md:text-2xl">
                Drop your files here,{' '}
                <button
                    className="text-[#3782da] hover:underline"
                    onClick={() => inputRef && inputRef.current!.click()}
                    type="button"
                >
                    browse files
                </button>{' '}
                or import from:
            </h1>
            <div className="grid grid-cols-3 grid-rows-2 sm:grid-cols-4 md:grid-cols-6">
                {methods.map(method => (
                    <button
                        type="button"
                        key={method.id}
                        className="group relative mb-4 flex flex-col items-center justify-center gap-1 rounded-md p-2 px-4 text-sm transition-all duration-300 hover:bg-[#e9ecef] active:bg-[#dfe6f1] disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-[#282828] dark:active:bg-[#333]"
                        disabled={method.disabled}
                        onKeyDown={e => {
                            if (e.key === 'Enter') e.preventDefault()
                        }}
                        onClick={() => handleMethodClick(method.id)}
                    >
                        <span className="rounded-lg bg-white p-[6px] text-2xl shadow dark:bg-[#323232]">
                            {method.icon}
                        </span>
                        <span className="text-[#525252] dark:text-[#777]">
                            {method.name}
                        </span>
                        <span className="absolute -bottom-2 hidden opacity-50 group-disabled:block">
                            (soon)
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default MethodsSelector
