import { useEffect, useRef, useState } from 'react'
import { BaseConfigs } from '../types/BaseConfigs'

type onChangeType = BaseConfigs['onChange']

const useAddMore = (files: File[], onChange?: onChangeType) => {
    const [isAddingMore, setIsAddingMore] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        onChange && onChange(files)
        setIsAddingMore(false)
    }, [files])

    return { isAddingMore, setIsAddingMore, inputRef }
}

export default useAddMore
