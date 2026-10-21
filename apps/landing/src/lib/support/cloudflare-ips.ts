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

// An address is a list of 16-bit groups (IPv4 = 2 groups, IPv6 = 8). Plain
// numbers only: the landing tsconfig targets below ES2020, so no BigInt.
type ParsedIp = { family: 4 | 6; groups: number[] }

function parseIpv4(text: string): number[] | null {
    const parts = text.split('.')
    if (parts.length !== 4) return null
    const octets: number[] = []
    for (const part of parts) {
        if (!/^\d{1,3}$/.test(part)) return null
        const octet = Number(part)
        if (octet > 255) return null
        octets.push(octet)
    }
    return [(octets[0]! << 8) | octets[1]!, (octets[2]! << 8) | octets[3]!]
}

function parseIpv6(text: string): number[] | null {
    let body = text
    // A trailing dotted quad (::ffff:1.2.3.4) is the last two groups.
    let tail: number[] | null = null
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
    const texts = [...head, ...Array(Math.max(missing, 0)).fill('0'), ...rest]
    const groups: number[] = []
    for (const group of texts) {
        if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null
        groups.push(parseInt(group, 16))
    }
    if (tail !== null) {
        groups[6] = tail[0]!
        groups[7] = tail[1]!
    }
    return groups
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
        const groups = parseIpv6(text)
        if (groups === null) return null
        // IPv4-mapped (::ffff:a.b.c.d) is the IPv4 peer in disguise.
        if (groups.slice(0, 5).every(g => g === 0) && groups[5] === 0xffff) {
            return { family: 4, groups: groups.slice(6) }
        }
        return { family: 6, groups }
    }
    const groups = parseIpv4(text)
    return groups === null ? null : { family: 4, groups }
}

type Range = { family: 4 | 6; groups: number[]; bits: number }

function toRange(cidr: string): Range {
    const [address = '', bitsText = ''] = cidr.split('/')
    const parsed = parseIp(address)
    if (!parsed) throw new Error(`bad Cloudflare CIDR: ${cidr}`)
    return {
        family: parsed.family,
        groups: parsed.groups,
        bits: Number(bitsText),
    }
}

const RANGES: Range[] = [...CLOUDFLARE_IPV4, ...CLOUDFLARE_IPV6].map(toRange)

function inRange(ip: ParsedIp, range: Range): boolean {
    if (ip.family !== range.family) return false
    let remaining = range.bits
    for (let i = 0; i < range.groups.length && remaining > 0; i++) {
        const take = Math.min(16, remaining)
        const mask = (0xffff << (16 - take)) & 0xffff
        if ((ip.groups[i]! & mask) !== (range.groups[i]! & mask)) return false
        remaining -= take
    }
    return true
}

/** True when `ip` (IPv4, IPv6 or IPv4-mapped IPv6) is inside Cloudflare's
 *  published ranges. Anything unparseable is NOT Cloudflare. */
export function isCloudflareIp(ip: string): boolean {
    const parsed = parseIp(ip)
    if (!parsed) return false
    return RANGES.some(range => inRange(parsed, range))
}
