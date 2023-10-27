import { LIB_VERSION } from '../version'

import type { BaseConfigs } from 'types'

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
            <p className="text-xs text-[#9d9d9d] mb-1">Upup v{LIB_VERSION}</p>
            <p className="text-xs text-[#9d9d9d] mb-1 font-semibold">
                {customMessage ? `${customMessage}, ` : ''}
                {limit ? `Max ${limit} files, ` : ''}
                {sizeLimit}
            </p>
            <p className="text-xs text-[#9d9d9d] mb-4">Powered by uNotes</p>
        </>
    )
}

export default MetaVersion
