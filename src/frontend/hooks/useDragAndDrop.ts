import { MouseEvent, useRef, useState } from 'react'

export default function useDragAndDrop() {
    const [isDragging, setIsDragging] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleDragEnter = (e: MouseEvent<HTMLDivElement, DragEvent>) => {
        e.preventDefault()
        if (
            e.currentTarget === containerRef.current ||
            containerRef.current!.contains(e.currentTarget)
        )
            setIsDragging(true)
    }

    const handleDragLeave = (e: MouseEvent<HTMLDivElement, DragEvent>) => {
        e.preventDefault()
        if (
            e.currentTarget === containerRef.current ||
            containerRef.current!.contains(e.currentTarget)
        )
            if (!containerRef.current!.contains(e.relatedTarget as Node))
                setIsDragging(false)
    }

    return {
        isDragging,
        setIsDragging,
        handleDragEnter,
        handleDragLeave,
        containerRef,
    }
}
