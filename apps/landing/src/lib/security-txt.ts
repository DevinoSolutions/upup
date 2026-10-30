// The body of /.well-known/security.txt (RFC 9116), part of the fleet
// agent-surface contract (GetItDone T-5785). Same contact as devino.ca's own
// security.txt: upup is a Devino product.
//
// RENEW `SECURITY_TXT_EXPIRES` before it passes: an expired file is treated as
// invalid (RFC 9116 section 2.5.5). src/__tests__/agent-surface.test.ts fails
// once fewer than 30 days remain, and the fleet's daily agent-surface check
// fails on production the day it lapses. RFC 9116 asks for less than a year.
import { siteUrl } from '@/lib/site-url'

export const SECURITY_TXT_PATH = '/.well-known/security.txt'
export const SECURITY_CONTACT = 'mailto:aladdin@devino.ca'
export const SECURITY_TXT_EXPIRES = '2027-04-26T00:00:00.000Z'

export function securityTxt(): string {
    return [
        '# Security contact for upup (useupup.com and the @useupup/* packages): RFC 9116.',
        '# Update Expires before it passes; an expired file is treated as invalid.',
        '',
        `Contact: ${SECURITY_CONTACT}`,
        `Expires: ${SECURITY_TXT_EXPIRES}`,
        'Preferred-Languages: en, fr',
        `Canonical: ${siteUrl()}${SECURITY_TXT_PATH}`,
        '',
    ].join('\n')
}
