import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'
import AdapterSelector from './AdapterSelector'
import AdapterView from './AdapterView'
import FileList from './FileList'
import ShouldRender from './shared/ShouldRender'

type Props = {
    isDragging: boolean
    setIsDragging: Dispatch<SetStateAction<boolean>>
}

enum BoxState {
    AdapterSelector = 'adapter_selector',
    AdapterView = 'adapter_view',
    Preview = 'preview',
}

export default function MainBox({ isDragging, setIsDragging }: Props) {
    const {
        files,
        activeAdapter,
        isAddingMore,
        props: { mini, dark },
    } = useRootContext()
    const [boxState, setBoxState] = useState(BoxState.AdapterSelector)

    useEffect(() => {
        if (activeAdapter) setBoxState(BoxState.AdapterView)
        else {
            if (!isAddingMore && files.length) setBoxState(BoxState.Preview)
            else setBoxState(BoxState.AdapterSelector)
        }
    }, [files.length, isAddingMore, activeAdapter])

    return (
        <div className="relative flex-1 overflow-hidden">
            <ShouldRender if={boxState === BoxState.AdapterSelector}>
                <AdapterSelector
                    isDragging={isDragging}
                    setIsDragging={setIsDragging}
                />
            </ShouldRender>
            <ShouldRender if={boxState === BoxState.Preview}>
                <FileList />
            </ShouldRender>
            <ShouldRender if={boxState === BoxState.AdapterView}>
                <AdapterView />
            </ShouldRender>

            <Toaster
                duration={2500}
                pauseWhenPageIsHidden
                className={cn(
                    'absolute left-[calc((100%-280px)/2)] mx-auto w-[280px]',
                    {
                        'left-[calc((100%-600px)/2)] sm:w-[600px]': !mini,
                    },
                )}
                toastOptions={{
                    classNames: {
                        toast: `px-3 py-2 w-[200px] mx-auto left-[calc((100%-200px)/2)] ${
                            mini
                                ? ''
                                : 'sm:w-[400px] left-[calc((100%-400px)/2)]'
                        }`,
                    },
                }}
                richColors
                closeButton
                theme={dark ? 'dark' : 'light'}
            />
        </div>
    )
}
