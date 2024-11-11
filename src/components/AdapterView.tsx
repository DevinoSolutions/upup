import CameraUploader from 'components/CameraUploader'
import GoogleDriveUploader from 'components/GoogleDriveUploader'
import OneDriveUploader from 'components/OneDriveUploader'
import UrlUploader from 'components/UrlUploader'
import { useConfigContext } from 'context/config-context'
import { AnimatePresence, motion } from 'framer-motion'
import { memo, useCallback, useMemo } from 'react'
import { Adapter } from 'types'
import { getAdapterDetails } from 'utils'

const adapterComponents = {
    [Adapter.GOOGLE_DRIVE]: <GoogleDriveUploader />,
    [Adapter.ONE_DRIVE]: <OneDriveUploader />,
    [Adapter.LINK]: <UrlUploader />,
    [Adapter.CAMERA]: <CameraUploader />,
}

export default memo(function AdapterView() {
    const { activeAdapter, setActiveAdapter } = useConfigContext()
    const { title: activeAdapterTitle } = useMemo(
        () => getAdapterDetails(activeAdapter),
        [activeAdapter],
    )
    const ActiveAdapterComponent = useMemo(
        () =>
            adapterComponents[activeAdapter as keyof typeof adapterComponents],
        [activeAdapter],
    )

    const handleClick = useCallback(() => {
        setActiveAdapter(Adapter.INTERNAL)
    }, [setActiveAdapter])
    if (activeAdapter === Adapter.INTERNAL) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '-100%' }}
                className="absolute z-20 grid h-full w-full grid-rows-[auto,1fr] "
            >
                <div className="group flex h-12 items-center justify-between border-b bg-[#fafafa] p-2 text-sm font-medium text-[#1b5dab] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                    <button
                        className="rounded-md p-2 px-4 transition-all duration-300 hover:bg-[#e9ecef] active:bg-[#dfe6f1] dark:group-hover:text-[#1f1f1f]"
                        onClick={handleClick}
                        type="button"
                    >
                        Cancel
                    </button>
                    <p className="text-[#333] dark:text-[#fafafa]">
                        Import from {activeAdapterTitle}
                    </p>
                    <button
                        className="rounded-md p-2 px-4 opacity-0 transition-all duration-300 hover:bg-[#e9ecef] active:bg-[#dfe6f1]"
                        type="button"
                    >
                        Cancel
                    </button>
                </div>

                <div className="flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                    {ActiveAdapterComponent}
                </div>
            </motion.div>
        </AnimatePresence>
    )
})
