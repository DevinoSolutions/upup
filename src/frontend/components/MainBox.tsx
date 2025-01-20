import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useRootContext } from '../context/RootContext'
import AdapterSelector from './AdapterSelector'
import AdapterView from './AdapterView'
import Preview from './Preview'
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
    const { files, activeAdapter, isAddingMore, setIsAddingMore } =
        useRootContext()
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
                <Preview onAddMore={setIsAddingMore} />
            </ShouldRender>
            <ShouldRender if={boxState === BoxState.AdapterView}>
                <AdapterView />
            </ShouldRender>
        </div>
    )
}
