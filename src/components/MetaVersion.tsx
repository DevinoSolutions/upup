import { LIB_VERSION } from '../version'

const MetaVersion = () => {
    return (
        <>
            <p className="text-xs text-[#9d9d9d] mb-2">Upup v{LIB_VERSION}</p>
            <p className="text-xs text-[#9d9d9d] mb-4">Powered by uNotes</p>
        </>
    )
}

export default MetaVersion
