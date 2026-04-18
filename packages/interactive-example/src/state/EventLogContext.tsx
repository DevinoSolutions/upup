import React, { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export type EventLogEntry = {
    id: number
    name: string
    args: unknown[]
    timestamp: number
}

type EventLogContextValue = {
    entries: EventLogEntry[]
    record: (name: string, args: unknown[]) => void
    clear: () => void
}

const EventLogContext = createContext<EventLogContextValue | null>(null)

const MAX_ENTRIES = 200

export function EventLogProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<EventLogEntry[]>([])
    const idRef = useRef(0)

    const record = useCallback((name: string, args: unknown[]) => {
        idRef.current += 1
        const entry: EventLogEntry = {
            id: idRef.current,
            name,
            args,
            timestamp: Date.now(),
        }
        setEntries((prev) => {
            const next = [...prev, entry]
            // Ring buffer so long-running sessions don't grow unbounded
            return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next
        })
    }, [])

    const clear = useCallback(() => setEntries([]), [])

    return (
        <EventLogContext.Provider value={{ entries, record, clear }}>
            {children}
        </EventLogContext.Provider>
    )
}

export function useEventLog() {
    return useContext(EventLogContext)
}
