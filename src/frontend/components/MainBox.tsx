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

export default function MainBox({
    isDragging,
    setIsDragging,
}: Readonly<Props>) {
    const {
        files,
        activeAdapter,
        isAddingMore,
        toastContainerId,
        props: { dark },
    } = useRootContext()

    return (
        <div className="relative flex-1 overflow-hidden [&_.Toastify]:absolute [&_.Toastify]:bottom-0 [&_.Toastify]:left-0 [&_.Toastify]:right-0 [&_.Toastify__toast-container]:relative">
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
                    position="bottom-center"
                    className="!relative !bottom-2 !left-1/2 !w-[320px] !max-w-[90%] !-translate-x-1/2"
                    limit={2}
                    theme={dark ? 'dark' : 'light'}
                    containerId={toastContainerId}
                    progressClassName="h-0"
                    hideProgressBar
                    newestOnTop
                    stacked
                />
            </ShouldRender>
        </div>
    )
}
