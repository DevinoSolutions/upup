import * as packageJson from '../../package.json'

const MetaVersion = () => {
    return (
        <>
            <p className="text-xs text-[#9d9d9d] mb-4">
                ًّUpup v{packageJson.version}
            </p>
            <p className="text-xs text-[#9d9d9d] mb-4">Powered by uNotes</p>
        </>
    )
}

export default MetaVersion
