import { LIB_VERSION } from '../version'

const MetaVersion = ({ customMessage }: { customMessage?: string }) => {
    return (
        <>
            <p className="text-xs text-[#9d9d9d] mb-1">Upup v{LIB_VERSION}</p>
            {customMessage && (
                <p className="text-xs text-[#9d9d9d] mb-1 font-semibold">
                    {customMessage}
                </p>
            )}
            <p className="text-xs text-[#9d9d9d] mb-4">Powered by uNotes</p>
        </>
    )
}

export default MetaVersion
