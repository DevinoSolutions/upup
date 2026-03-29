'use client'

import { useCallback, useRef, useState } from 'react'

export type InformerMessageType = 'error' | 'warning' | 'info'

export type InformerMessage = {
    id: string
    type: InformerMessageType
    text: string
}

const DEFAULT_AUTO_DISMISS_DELAY = 6000

export type UseInformerReturn = {
    messages: InformerMessage[]
    addMessage: (text: string, type?: InformerMessageType) => void
    dismissMessage: (id: string) => void
}

export default function useInformer(infoTimeout?: number): UseInformerReturn {
    const [messages, setMessages] = useState<InformerMessage[]>([])
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
        new Map(),
    )

    const dismissMessage = useCallback((id: string) => {
        setMessages(prev => prev.filter(m => m.id !== id))
        const timer = timersRef.current.get(id)
        if (timer) {
            clearTimeout(timer)
            timersRef.current.delete(id)
        }
    }, [])

    const addMessage = useCallback(
        (text: string, type: InformerMessageType = 'info') => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
            setMessages(prev => [...prev, { id, type, text }])
            const timer = setTimeout(() => {
                dismissMessage(id)
            }, infoTimeout ?? DEFAULT_AUTO_DISMISS_DELAY)
            timersRef.current.set(id, timer)
        },
        [dismissMessage],
    )

    return { messages, addMessage, dismissMessage }
}
