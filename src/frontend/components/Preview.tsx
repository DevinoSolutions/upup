import { motion } from 'framer-motion'
import React, { memo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useRootContext } from '../context/RootContext'
import PreviewComponent from './PreviewComponent'
import ShouldRender from './shared/ShouldRender'

export default memo(function Preview() {
    const {
        files,
        props: { onFileClick },
        upload: { proceedUpload, isUploading },
    } = useRootContext()

    return (
        <ShouldRender if={!!files.length}>
            <motion.div
                className={`preview-scroll flex h-fit max-h-[180px] flex-col gap-[10px] overflow-y-auto lg:max-h-[316px] lg:gap-5 ${
                    files.length >= 2 ? 'pr-5 lg:pr-[26px]' : ''
                }`}
            >
                {files.map(file => (
                    <PreviewComponent
                        key={uuidv4()}
                        file={file}
                        index={files.indexOf(file)}
                        onClick={() => onFileClick(file)}
                    />
                ))}
            </motion.div>
            <button
                className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:animate-pulse"
                onClick={proceedUpload}
                disabled={isUploading}
            >
                Upload
            </button>
        </ShouldRender>
    )
})
