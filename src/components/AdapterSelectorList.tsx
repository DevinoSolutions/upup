import AdapterSelectorItem from 'components/AdapterSelectorItem'
import { useConfigContext } from 'context/config-context'
import { KeyboardEvent, MouseEvent, memo, useCallback } from 'react'
import { Adapter } from 'types'

export default memo(function AdapterSelectorList() {
    const { setActiveAdapter, inputRef, adapters } = useConfigContext()

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter') e.preventDefault()
    }, [])

    const handleClick = useCallback(
        (e: MouseEvent<HTMLButtonElement>) => {
            const adapter = e.currentTarget.id as Adapter

            if (adapter === Adapter.INTERNAL) inputRef?.current?.click()
            else setActiveAdapter(adapter)
        },
        [inputRef, setActiveAdapter],
    )

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
                {adapters?.map(adapter => (
                    <AdapterSelectorItem
                        key={adapter}
                        id={adapter}
                        className="group relative mb-4 flex flex-col items-center justify-center gap-1 rounded-md p-2 px-4 text-sm transition-all duration-300 hover:bg-[#e9ecef] active:bg-[#dfe6f1] dark:hover:bg-[#282828] dark:active:bg-[#333]"
                        onKeyDown={handleKeyDown}
                        onClick={handleClick}
                    />
                ))}
            </div>
        </div>
    )
})
