import { useCallback, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useRootContext } from '../context/RootContext'

const MIME_EXTENSION_MAP: Record<string, string> = {
    'application/json': 'json',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'image/jpeg': 'jpg',
    'text/csv': 'csv',
    'text/html': 'html',
    'text/markdown': 'md',
    'text/plain': 'txt',
}

function sanitizeFileName(value: string) {
    let decoded = value
    try {
        decoded = decodeURIComponent(value)
    } catch {
        decoded = value
    }
    decoded = decoded.trim()
    const lastSegment = decoded.split(/[\\/]/).filter(Boolean).pop() ?? ''
    return lastSegment.replace(/[\x00-\x1f\x7f<>:"/\\|?*]+/g, '_')
}

function extensionFromMime(type: string) {
    const mime = type.split(';')[0]?.trim().toLowerCase()
    if (!mime) return 'bin'

    if (MIME_EXTENSION_MAP[mime]) return MIME_EXTENSION_MAP[mime]

    const subtype = mime.split('/')[1]
    if (!subtype) return 'bin'

    return subtype.split('+').pop() || subtype
}

function fileNameFromContentDisposition(header: string | null) {
    if (!header) return undefined

    const encodedMatch = header.match(/filename\*=([^;]+)/i)
    if (encodedMatch?.[1]) {
        const value = encodedMatch[1].trim().replace(/^UTF-8''/i, '')
        const sanitized = sanitizeFileName(value)
        if (sanitized) return sanitized
    }

    const quotedMatch = header.match(/filename=(?:"([^"]+)"|([^;]+))/i)
    const value = quotedMatch?.[1] ?? quotedMatch?.[2]
    if (!value) return undefined

    const sanitized = sanitizeFileName(value)
    return sanitized || undefined
}

export function deriveFetchedFileName(url: string, response: Response, blob: Blob) {
    const dispositionName = fileNameFromContentDisposition(
        response.headers.get('content-disposition'),
    )
    if (dispositionName) return dispositionName

    try {
        const parsedUrl = new URL(url, globalThis.location?.href)
        if (['http:', 'https:', 'file:'].includes(parsedUrl.protocol)) {
            const urlName = sanitizeFileName(parsedUrl.pathname)
            if (urlName) return urlName
        }
    } catch {
        // Data/blob URLs and malformed user input fall through to a generated name.
    }

    return `${uuid()}.${extensionFromMime(blob.type || response.headers.get('content-type') || '')}`
}

export default function useFetchFileByUrl() {
    const {
        core,
        props: { onError },
    } = useRootContext()
    const [loading, setLoading] = useState(false)

    const fetchImage = useCallback(
        async (url: string) => {
            if (loading) return

            try {
                setLoading(true)
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`Failed to fetch URL: ${response.status}`)
                }
                const blob = await response.blob()
                const fileName = deriveFetchedFileName(url, response, blob)

                const file = new File([blob], fileName, {
                    type: blob.type,
                })

                // v2: emit url-fetch event via UpupCore
                core?.emit('url-fetch', { file })
                return file
            } catch (error) {
                onError((error as Error).message)
                return
            } finally {
                setLoading(false)
            }
        },
        [loading, onError],
    )

    return { loading, fetchImage }
}
