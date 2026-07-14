export const MIME_EXTENSION_MAP: Record<string, string> = {
    'application/json': 'json',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'image/jpeg': 'jpg',
    'text/csv': 'csv',
    'text/html': 'html',
    'text/markdown': 'md',
    'text/plain': 'txt',
}

export function sanitizeFileName(value: string): string {
    let decoded: string
    try {
        decoded = decodeURIComponent(value)
    } catch {
        // upup-catch: value isn't valid percent-encoding — fall back to the raw string
        decoded = value
    }
    decoded = decoded.trim()
    const lastSegment = decoded.split(/[\\/]/).filter(Boolean).pop() ?? ''
    return lastSegment.replace(/[\x00-\x1f\x7f<>:"/\\|?*]+/g, '_')
}

export function extensionFromMime(type: string): string {
    const mime = type.split(';')[0]?.trim().toLowerCase()
    if (!mime) return 'bin'

    if (MIME_EXTENSION_MAP[mime]) return MIME_EXTENSION_MAP[mime]

    const subtype = mime.split('/')[1]
    if (!subtype) return 'bin'

    return subtype.split('+').pop() || subtype
}

export function fileNameFromContentDisposition(
    header: string | null,
): string | undefined {
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

export function deriveFetchedFileName(
    url: string,
    response: Response,
    blob: Blob,
): string {
    const dispositionName = fileNameFromContentDisposition(
        response.headers.get('content-disposition'),
    )
    if (dispositionName) return dispositionName

    try {
        const parsedUrl = new URL(url, globalThis.location.href)
        if (['http:', 'https:', 'file:'].includes(parsedUrl.protocol)) {
            const urlName = sanitizeFileName(parsedUrl.pathname)
            if (urlName) return urlName
        }
    } catch {
        // upup-catch: data/blob URLs and malformed user input fall through to a generated name
    }

    return `${crypto.randomUUID()}.${extensionFromMime(blob.type || response.headers.get('content-type') || '')}`
}
