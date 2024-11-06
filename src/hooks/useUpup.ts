import { Dispatch, SetStateAction } from 'react'
import { BaseConfigs } from 'types/BaseConfigs'

type Props = BaseConfigs & {
    setFiles?: Dispatch<SetStateAction<File[]>>
}

export const useUpup = (
    props: Props = {
        accept: '*',
        setFiles: () => {},
        multiple: false,
        mini: false,
    },
) => {
    const { accept, setFiles } = props

    const baseConfigs: BaseConfigs = {
        ...props,
        onChange: (files: File[]) => (setFiles ? setFiles(files) : () => {}),
    }

    return {
        baseConfigs,
    }
}
