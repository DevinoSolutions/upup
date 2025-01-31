import React, { Dispatch, SetStateAction } from 'react'
import { ToastContainer } from 'react-toastify'
import { useRootContext } from '../context/RootContext'
import AdapterSelector from './AdapterSelector'
import AdapterView from './AdapterView'
import FileList from './FileList'
import ShouldRender from './shared/ShouldRender'

type Props = {
    isDragging: boolean
    setIsDragging: Dispatch<SetStateAction<boolean>>
}

export default function MainBox({ isDragging, setIsDragging }: Props) {
    const {
        files,
        activeAdapter,
        isAddingMore,
        toastContainerId,
        props: { dark },
    } = useRootContext()

    return (
        <div className="relative flex-1 overflow-hidden">
            <ShouldRender if={!!activeAdapter}>
                <AdapterView />
            </ShouldRender>
            <ShouldRender if={!activeAdapter && (isAddingMore || !files.size)}>
                <AdapterSelector
                    isDragging={isDragging}
                    setIsDragging={setIsDragging}
                />
            </ShouldRender>
            <FileList />

            <ShouldRender if={!!toastContainerId}>
                <ToastContainer
                    className="absolute"
                    limit={3}
                    theme={dark ? 'dark' : 'light'}
                    containerId={toastContainerId}
                    progressClassName="h-0"
                    hideProgressBar
                    newestOnTop
                />
            </ShouldRender>
        </div>
    )
}
