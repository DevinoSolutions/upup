import React, { useContext, useMemo, useState } from 'react'
import { ConfigContext } from '../state/ConfigContext'
import { generateCode } from './generateCode'

export function CodeTab() {
    const ctx = useContext(ConfigContext)
    const [copied, setCopied] = useState(false)
    const code = useMemo(() => (ctx ? generateCode(ctx.config) : ''), [ctx?.config])

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            // clipboard denied — silently ignore
        }
    }

    return (
        <div className="upup-ie-code-tab">
            <div className="upup-ie-code-header">
                <button type="button" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre className="upup-ie-code-pre">
                <code>{code}</code>
            </pre>
        </div>
    )
}
