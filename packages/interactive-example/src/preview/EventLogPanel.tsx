import React, { useEffect, useRef } from 'react'
import { useEventLog, type EventLogEntry } from '../state/EventLogContext'

function formatTime(ts: number): string {
    const d = new Date(ts)
    const pad = (n: number, w = 2) => String(n).padStart(w, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

function summariseArg(arg: unknown): string {
    if (arg === undefined) return 'undefined'
    if (arg === null) return 'null'
    if (typeof arg === 'string') return JSON.stringify(arg)
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg)
    if (arg instanceof File) {
        return `File("${arg.name}", ${arg.size}B, ${arg.type || '?'})`
    }
    if (Array.isArray(arg)) return `Array(${arg.length})`
    if (typeof arg === 'object') {
        try {
            const json = JSON.stringify(arg)
            return json.length > 120 ? `${json.slice(0, 117)}…` : json
        } catch {
            return '[object]'
        }
    }
    return String(arg)
}

function Row({ entry }: { entry: EventLogEntry }) {
    const preview = entry.args.length === 0
        ? ''
        : entry.args.map(summariseArg).join(', ')
    return (
        <li className="upup-ie-eventlog-row">
            <span className="upup-ie-eventlog-time">{formatTime(entry.timestamp)}</span>
            <span className="upup-ie-eventlog-name">{entry.name}</span>
            {preview ? <span className="upup-ie-eventlog-args">{preview}</span> : null}
        </li>
    )
}

export function EventLogPanel() {
    const log = useEventLog()
    const listRef = useRef<HTMLUListElement>(null)

    // Autoscroll to newest when entries arrive — users want to see the latest
    // without chasing the scroll position.
    useEffect(() => {
        if (!log || !listRef.current) return
        listRef.current.scrollTop = listRef.current.scrollHeight
    }, [log?.entries.length])

    if (!log) return null

    return (
        <div className="upup-ie-eventlog" aria-live="polite">
            <div className="upup-ie-eventlog-header">
                <span className="upup-ie-eventlog-title">
                    Event log
                    <span className="upup-ie-eventlog-count">
                        {log.entries.length > 0 ? ` · ${log.entries.length}` : ''}
                    </span>
                </span>
                <button
                    type="button"
                    className="upup-ie-eventlog-clear"
                    onClick={log.clear}
                    disabled={log.entries.length === 0}
                >
                    Clear
                </button>
            </div>
            {log.entries.length === 0 ? (
                <p className="upup-ie-eventlog-empty">
                    Toggle an event in the sidebar and interact with the uploader —
                    every fired event will appear here with its arguments.
                </p>
            ) : (
                <ul ref={listRef} className="upup-ie-eventlog-list">
                    {log.entries.map((e) => (
                        <Row key={e.id} entry={e} />
                    ))}
                </ul>
            )}
        </div>
    )
}
