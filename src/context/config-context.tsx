import { CircularProgress } from '@mui/material'
import {
    createContext,
    Dispatch,
    PropsWithChildren,
    ReactElement,
    RefObject,
    SetStateAction,
    useContext,
    useEffect,
    useState,
} from 'react'

import { Adapter } from 'types'

export type AdapterConfig = {
    clientId: string
    apiKey: string
}

export type ConfigContextProps = {
    // Passed by developer
    adaptersConfigs?: {
        oneDrive?: Omit<AdapterConfig, 'apiKey'>
        googleDrive?: AdapterConfig
    }

    // Initialized by UpupUploader
    adapters?: Adapter[]
    inputRef?: RefObject<HTMLInputElement>
    activeAdapter: Adapter
    setActiveAdapter: Dispatch<SetStateAction<Adapter>>

    loader?: ReactElement
    accept?: string
    files: File[]
    setFiles: Dispatch<SetStateAction<File[]>>
}

const ConfigContext = createContext<ConfigContextProps>({
    adapters: [],
    activeAdapter: Adapter.INTERNAL,
    setActiveAdapter: () => {},
    loader: <CircularProgress />,
    files: [],
    setFiles: () => {},
})

export function ConfigContextProvider({
    children,
    ...rest
}: PropsWithChildren<
    Omit<ConfigContextProps, 'adapters' | 'activeAdapter' | 'setActiveAdapter'>
>) {
    const [activeAdapter, setActiveAdapter] = useState<Adapter>(
        Adapter.INTERNAL,
    )
    const [adapters, setAdapters] = useState<Adapter[]>([
        Adapter.INTERNAL,
        Adapter.LINK,
        Adapter.CAMERA,
    ])

    useEffect(() => {
        const newAdapters = [...adapters]
        if (
            rest.adaptersConfigs?.oneDrive &&
            !newAdapters.includes(Adapter.ONE_DRIVE)
        )
            newAdapters.push(Adapter.ONE_DRIVE)
        if (
            rest.adaptersConfigs?.googleDrive &&
            !newAdapters.includes(Adapter.GOOGLE_DRIVE)
        )
            newAdapters.push(Adapter.GOOGLE_DRIVE)
        setAdapters(newAdapters)
    }, [rest.adaptersConfigs])

    return (
        <ConfigContext.Provider
            value={{ adapters, activeAdapter, setActiveAdapter, ...rest }}
        >
            {children}
        </ConfigContext.Provider>
    )
}

export function useConfigContext() {
    return useContext(ConfigContext)
}

export default ConfigContext
