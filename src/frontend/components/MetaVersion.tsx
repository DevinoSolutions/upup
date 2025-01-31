import React from 'react'
import { LIB_VERSION } from '../../version'
import { useRootContext } from '../context/RootContext'

export default function MetaVersion() {
    const {
        props: { customMessage, maxFileSize, limit },
    } = useRootContext()
    const sizeLimit = `up to ${maxFileSize.size}${maxFileSize.unit || 'B'}.`
    const displayMessage = [customMessage, limit, sizeLimit]
        .map(item => (item === 'limit' ? `Max ${limit} files` : item))
        .filter(Boolean)
        .join(', ')

    return (
        <>
            <p className="mb-1 text-xs text-[#9d9d9d]">Upup v{LIB_VERSION}</p>
            <p className="mb-1 text-xs font-semibold text-[#9d9d9d]">
                {displayMessage}
            </p>
            <p className="mb-4 text-xs text-[#9d9d9d]">Powered by uNotes</p>
        </>
    )
}
