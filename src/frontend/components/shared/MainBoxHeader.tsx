import React from 'react'
import { TbPlus } from 'react-icons/tb'
import { useRootContext } from '../../context/RootContext'
import ShouldRender from './ShouldRender'

type Props = {
    handleCancel(): void
}

export default function MainBoxHeader({ handleCancel }: Props) {
    const { files, setIsAddingMore, isAddingMore } = useRootContext()

    return (
        <div className="absolute left-0 right-0 top-0 grid grid-cols-4 items-center justify-between rounded-t-lg border-b border-[#e0e0e0] bg-[#fafafa] px-3 py-2 max-md:grid-rows-2">
            <button
                className="max-md p-1 text-left text-sm text-blue-600 max-md:col-start-1 max-md:col-end-3 max-md:row-start-2"
                onClick={handleCancel}
            >
                Cancel
            </button>
            <span className="text-center text-sm max-md:col-span-4 md:col-span-2">
                <ShouldRender if={isAddingMore}>Adding more files</ShouldRender>
                <ShouldRender if={!isAddingMore}>
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                </ShouldRender>
            </span>
            <ShouldRender if={!isAddingMore}>
                <button
                    className="flex items-center justify-end gap-1 p-1 text-sm text-blue-600 max-md:col-start-3 max-md:col-end-5"
                    onClick={() => setIsAddingMore(true)}
                >
                    <TbPlus /> Add More
                </button>
            </ShouldRender>
        </div>
    )
}
