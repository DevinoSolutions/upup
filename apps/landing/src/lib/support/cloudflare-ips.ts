// Cloudflare's published edge ranges, used to decide whether the immediate peer
// of a request is Cloudflare — the only hop allowed to vouch for a
// `cf-connecting-ip` header (see rate-limit.ts).
//
// Source: https://www.cloudflare.com/ips-v4 and /ips-v6, fetched 2026-10-21.
// Cloudflare changes these rarely and announces it; refresh both lists from
// those two URLs when it does. A stale list fails SAFE: an unlisted edge is
// simply treated as an ordinary peer, so the limiter keys on the peer address
// (coarser shared buckets) instead of the client's.

const CLOUDFLARE_IPV4 = [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '131.0.72.0/22',
] as const

const CLOUDFLARE_IPV6 = [
    '2400:cb00::/32',
    '2606:4700::/32',
    '2803:f800::/32',
    '2405:b500::/32',
    '2405:8100::/32',
    '2a06:98c0::/29',
    '2c0f:f248::/32',
] as const

type ParsedIp = { family: 4 | 6; value: bigint }

function parseIpv4(text: string): bigint | null {
    const parts = text.split('.')
    if (parts.length !== 4) return null
    let value = 0n
    for (const part of parts) {
        if (!/^\d{1,3}$/.test(part)) return null
        const octet = Number(part)
        if (octet > 255) return null
        value = (value << 8n) | BigInt(octet)
    }
    return value
}

function parseIpv6(text: string): bigint | null {
    let body = text
    // A trailing dotted quad (::ffff:1.2.3.4) is the last 32 bits.
    let tail: bigint | null = null
    const lastColon = body.lastIndexOf(':')
    if (body.slice(lastColon + 1).includes('.')) {
        tail = parseIpv4(body.slice(lastColon + 1))
        if (tail === null) return null
        body = `${body.slice(0, lastColon + 1)}0:0`
    }
    const halves = body.split('::')
    if (halves.length > 2) return null
    const toGroups = (half: string): string[] =>
        half === '' ? [] : half.split(':')
    const head = toGroups(halves[0] ?? '')
    const rest = halves.length === 2 ? toGroups(halves[1] ?? '') : []
    const missing = 8 - head.length - rest.length
    if (halves.length === 2 ? missing < 1 : missing !== 0) return null
    const groups = [...head, ...Array(Math.max(missing, 0)).fill('0'), ...rest]
    let value = 0n
    for (const group of groups) {
        if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null
        value = (value << 16n) | BigInt(parseInt(group, 16))
    }
    if (tail !== null) value = (value & ~0xffffffffn) | tail
    return value
}

function parseIp(raw: string): ParsedIp | null {
    // Drop brackets some proxies add and an IPv6 zone id (fe80::1%eth0).
    const text = (
        raw
            .trim()
            .replace(/^\[|\]$/g, '')
            .split('%')[0] ?? ''
    ).trim()
    if (!text) return null
    if (text.includes(':')) {
        const value = parseIpv6(text)
        if (value === null) return null
        // IPv4-mapped (::ffff:a.b.c.d) is the IPv4 peer in disguise.
        if (value >> 32n === 0xffffn) {
            return { family: 4, value: value & 0xffffffffn }
        }
        return { family: 6, value }
    }
    const value = parseIpv4(text)
    return value === null ? null : { family: 4, value }
}

type Range = { family: 4 | 6; network: bigint; mask: bigint }

function toRange(cidr: string): Range {
    const [address = '', bitsText = ''] = cidr.split('/')
    const parsed = parseIp(address)
    if (!parsed) throw new Error(`bad Cloudflare CIDR: ${cidr}`)
    const total = parsed.family === 4 ? 32n : 128n
    const bits = BigInt(bitsText)
    const mask = ((1n << total) - 1n) ^ ((1n << (total - bits)) - 1n)
    return { family: parsed.family, network: parsed.value & mask, mask }
}

const RANGES: Range[] = [...CLOUDFLARE_IPV4, ...CLOUDFLARE_IPV6].map(toRange)

/** True when `ip` (IPv4, IPv6 or IPv4-mapped IPv6) is inside Cloudflare's
 *  published ranges. Anything unparseable is NOT Cloudflare. */
export function isCloudflareIp(ip: string): boolean {
    const parsed = parseIp(ip)
    if (!parsed) return false
    return RANGES.some(
        r =>
            r.family === parsed.family && (parsed.value & r.mask) === r.network,
    )
}
