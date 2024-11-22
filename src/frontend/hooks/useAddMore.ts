import { useEffect, useRef, useState } from 'react'
import { BaseConfigs } from '../types'

type onChangeType = BaseConfigs['onChange']

export const useAddMore = (files: File[], onChange?: onChangeType) => {
    const [isAddingMore, setIsAddingMore] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        onChange && onChange(files)
        setIsAddingMore(false)
    }, [files])

    return { isAddingMore, setIsAddingMore, inputRef }
}
