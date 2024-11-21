import { LIB_VERSION } from 'version'

import type { BaseConfigs } from 'frontend/types'

const MetaVersion = ({
    customMessage,
    maxFileSize,
    limit,
}: {
    customMessage?: BaseConfigs['customMessage']
    maxFileSize: BaseConfigs['maxFileSize']
    limit: BaseConfigs['limit']
}) => {
    const mfs = maxFileSize! // can't be undefined since we have default value
    const sizeLimit = `up to ${mfs.size}${mfs.unit || 'B'}.`

    return (
        <>
            <p className="mb-1 text-xs text-[#9d9d9d]">Upup v{LIB_VERSION}</p>
            <p className="mb-1 text-xs font-semibold text-[#9d9d9d]">
                {customMessage ? `${customMessage}, ` : ''}
                {limit ? `Max ${limit} files, ` : ''}
                {sizeLimit}
            </p>
            <p className="mb-4 text-xs text-[#9d9d9d]">Powered by uNotes</p>
        </>
    )
}

export default MetaVersion
