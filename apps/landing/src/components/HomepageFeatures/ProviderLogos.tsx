import type { CSSProperties } from 'react'

// Official marks for the storage providers that react-icons/simple-icons do
// not ship (simple-icons 16.34.0 has no linode, akamai, idrive or ibm slug),
// replacing the generic FontAwesome stand-ins (FaServer / FaDatabase /
// FaCube) the integration wall used to draw. Each path is copied verbatim
// from the vendor's OWN published artwork, fetched 2026-10-10 — never
// redrawn. Only two things change: the viewBox is cropped to the mark, and
// the vendor colour becomes currentColor so the mark follows the same
// gray/hover text colour as every react-icons glyph beside it, in light and
// dark themes alike. Trademarks of their owners, used nominatively to label
// the integration that talks to that provider. Decorative: the visible
// provider name is the accessible label, so every mark is aria-hidden.

interface ProviderLogoProps {
    className?: string
    style?: CSSProperties
}

// Linode (Akamai Cloud): the swoosh icon, i.e. the #00AFEB path of the
// "Akamai Cloud" lockup Linode's own header serves at
// https://www.linode.com/linode/en/images/logo/akamai-cloud-logo.svg — the
// same mark as https://assets.linode.com/icons/favicon.ico.
const LINODE_MARK =
    'M22.8923 44.0093C23.9483 44.3314 23.8997 45 22.7466 45C10.1959 45 0 34.9169 0 22.4939C0 10.0709 10.1959 0 22.7466 0C23.9179 0 24.1668 0.626013 23.2018 0.905592C13.7524 3.63452 6.85797 12.265 6.85797 22.4939C6.85797 32.7229 13.6006 41.1771 22.8923 44.0093ZM11.1609 27.7694C11.1002 27.1738 11.0759 26.56 11.0759 25.934C11.0759 16.0758 19.0931 8.07739 28.9795 8.07739C38.3258 8.07739 41.1357 12.2346 41.4877 11.9733C41.8701 11.6694 38.0951 3.40964 27.1224 3.40964C17.2178 3.40964 9.20668 11.4019 9.20668 21.2784C9.20668 23.5515 9.63151 25.7395 10.4205 27.7391C10.7421 28.5717 11.2519 28.5839 11.167 27.7694H11.1609ZM18.6622 14.8906C23.311 12.8606 29.1676 12.8059 34.915 14.8055C38.7749 16.1487 41.0143 18.0754 41.1903 17.9842C41.4998 17.8505 38.9387 13.827 34.3445 12.0766C28.7731 9.97366 22.7588 11.0677 18.3891 14.4955C17.9218 14.8906 18.0978 15.1398 18.6683 14.8906H18.6622Z'

// IDrive: the padlock-"e" mark, i.e. the three red paths of the IDrive logo
// that the IDrive e2 page serves at
// https://static.idriveonlinebackup.com/s3-storage-e2/source/images/idrive_logo3.svg
// — the same mark as https://static.idriveonlinebackup.com/include/images/favicon.ico.
const IDRIVE_MARK = [
    'M64.4,3.9c-0.9-1.5-2.2-2.5-3.9-3c-1.7-0.5-3.3-0.3-4.8,0.6s-2.5,2.2-3,3.9c-0.1,0.3-0.1,0.5-0.2,0.8c0.9-0.5,1.8-0.7,2.7-0.7c0.3-0.8,0.9-1.4,1.6-1.9c1-0.5,2-0.7,3-0.4s1.9,0.9,2.4,1.8c0.5,0.8,0.6,1.6,0.5,2.4c0.8,0.4,1.4,1,2,2C64.9,9.3,65,9,65.1,8.7C65.5,7,65.3,5.4,64.4,3.9z',
    'M58.8,13.3h-3.7c0-0.6,0.2-1,0.5-1.4c0.3-0.3,0.8-0.5,1.3-0.5c0.6,0,1,0.2,1.3,0.5C58.5,12.2,58.7,12.6,58.8,13.3z',
    'M64.4,10.3c0-0.1-0.1-0.2-0.1-0.3c0-0.1-0.1-0.2-0.2-0.3c-0.4-0.6-0.9-1-1.5-1.4C62.3,8.2,61.9,8,61.5,8l-5.3-1.4c-0.4-0.1-0.8-0.2-1.2-0.2c-0.8,0-1.5,0.2-2.3,0.6c-0.1,0-0.1,0.1-0.2,0.1c-0.3,0.2-0.7,0.5-0.9,0.8c-0.5,0.5-0.8,1.2-1,1.9L49.2,15c-0.3,1.2-0.2,2.4,0.5,3.5c0.6,1.1,1.5,1.8,2.8,2.2l5.3,1.4c1.2,0.3,2.4,0.2,3.5-0.5c1.1-0.6,1.8-1.5,2.2-2.8l1.4-5.3C65,12.4,64.9,11.4,64.4,10.3zM61.8,14.7c0,0.1,0,0.2,0,0.3h-6.8c0,0.8,0.2,1.3,0.6,1.7c0.3,0.4,0.9,0.6,1.5,0.6c0.5,0,0.8-0.1,1.1-0.3c0.1,0,0.2-0.1,0.2-0.1c0.1,0,0.1-0.1,0.2-0.2c0-0.1,0.1-0.2,0.3-0.3c0.2-0.1,0.4-0.2,0.8-0.2h2c-0.3,1-0.8,1.8-1.6,2.4c-0.8,0.6-1.8,0.9-3.1,0.9c-1.5,0-2.7-0.5-3.5-1.4c-0.8-0.9-1.3-2.2-1.3-3.8c0-1.6,0.4-2.8,1.2-3.7c0.8-0.9,2-1.4,3.5-1.4c1.6,0,2.8,0.5,3.7,1.3c0.8,0.9,1.3,2.2,1.3,3.8L61.8,14.7L61.8,14.7z',
] as const

// IBM: the 8-bar logo exactly as IBM's own Design Language site serves it,
// https://www.ibm.com/design/language/2285fa814297ab5eb0ffa21d2ee009db/ibm.svg
// (from https://www.ibm.com/design/language/ibm-logos/8-bar/), its 37
// polygons/rects/paths merged into one path, coordinates rounded to 4dp.
const IBM_MARK =
    'M0 18.808L9.7222 18.808L9.7222 20.2154L0 20.2154ZM0 16.1211L9.7222 16.1211L9.7222 17.5285L0 17.5285ZM2.7778 13.4343L6.9444 13.4343L6.9444 14.8417L2.7778 14.8417ZM2.7778 10.7474L6.9444 10.7474L6.9444 12.1548L2.7778 12.1548ZM2.7778 8.0606L6.9444 8.0606L6.9444 9.468L2.7778 9.468ZM2.7778 5.3737L6.9444 5.3737L6.9444 6.7811L2.7778 6.7811ZM0 2.6869H9.7222V4.0943H0ZM0 0H9.7222V1.4074H0ZM11.1111 17.5285L26.0606 17.5285C26.3131 17.0935 26.5025 16.6201 26.6162 16.1211L11.1111 16.1211L11.1111 17.5285ZM24.899 10.7474L13.8889 10.7474L13.8889 12.1548L26.0606 12.1548C25.7449 11.6174 25.3535 11.1441 24.899 10.7474ZM13.8889 8.0606L13.8889 9.468L24.899 9.468C25.3662 9.0713 25.7576 8.5979 26.0606 8.0606L13.8889 8.0606ZM26.0606 2.6869L11.1111 2.6869L11.1111 4.0943L26.6162 4.0943C26.4899 3.5953 26.3005 3.1219 26.0606 2.6869ZM21.4646 0L11.1111 0L11.1111 1.4074L25.0379 1.4074C24.1035 0.5374 22.8409 0 21.4646 0ZM13.8889 5.3737H18.0556V6.7811H13.8889ZM22.2222 6.7811L26.5783 6.7811C26.7045 6.3333 26.7677 5.8599 26.7677 5.3737L22.2222 5.3737L22.2222 6.7811ZM13.8889 13.4343L18.0556 13.4343L18.0556 14.8417L13.8889 14.8417ZM22.2222 13.4343L22.2222 14.8417L26.7677 14.8417C26.7677 14.3555 26.7045 13.8821 26.5783 13.4343L22.2222 13.4343ZM11.1111 20.2026L21.4646 20.2154C22.8535 20.2154 24.1035 19.678 25.0379 18.808L11.1111 18.808L11.1111 20.2026ZM27.7778 18.808L34.7222 18.808L34.7222 20.2154L27.7778 20.2154ZM27.7778 16.1211L34.7222 16.1211L34.7222 17.5285L27.7778 17.5285ZM30.5556 13.4343L34.7222 13.4343L34.7222 14.8417L30.5556 14.8417ZM30.5556 10.7474L34.7222 10.7474L34.7222 12.1548L30.5556 12.1548ZM36.654 2.6869L27.7778 2.6869L27.7778 4.0943L37.1338 4.0943ZM35.7323 0L27.7778 0L27.7778 1.4074L36.2121 1.4074ZM43.0556 18.808L50 18.808L50 20.2154L43.0556 20.2154ZM43.0556 16.1211L50 16.1211L50 17.5285L43.0556 17.5285ZM43.0556 13.4343L47.2222 13.4343L47.2222 14.8417L43.0556 14.8417ZM43.0556 10.7474L47.2222 10.7474L47.2222 12.1548L43.0556 12.1548ZM43.0556 9.468L47.2222 9.468L47.2222 8.0606L43.0556 8.0606L43.0556 8.0606L39.2803 8.0606L38.8889 9.1993L38.4975 8.0606L34.7222 8.0606L34.7222 8.0606L30.5556 8.0606L30.5556 9.468L34.7222 9.468L34.7222 8.1757L35.1641 9.468L42.6136 9.468L43.0556 8.1757ZM47.2222 5.3737L40.202 5.3737L39.7222 6.7811L47.2222 6.7811ZM42.0455 0L41.5657 1.4074L50 1.4074L50 0ZM38.8889 20.2026L39.3687 18.808L38.4091 18.808ZM37.9672 17.5285L39.8106 17.5285L40.303 16.1211L37.4747 16.1211ZM37.0328 14.8417L40.7449 14.8417L41.2374 13.4343L36.5404 13.4343ZM36.0985 12.1548L41.6793 12.1548L42.1591 10.7474L35.6187 10.7474ZM30.5556 6.7811L38.0556 6.7811L37.5758 5.3737L30.5556 5.3737ZM40.6439 4.0943L50 4.0943L50 2.6869L41.1237 2.6869Z'

export function LinodeLogo({ className, style }: ProviderLogoProps) {
    return (
        <svg
            viewBox="0 0 41.52 45"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
            data-provider-logo="linode"
            className={className}
            style={style}
        >
            <path d={LINODE_MARK} />
        </svg>
    )
}

export function IDriveLogo({ className, style }: ProviderLogoProps) {
    return (
        <svg
            viewBox="49 0.6 16.4 21.7"
            fill="currentColor"
            fillRule="evenodd"
            aria-hidden="true"
            focusable="false"
            data-provider-logo="idrive"
            className={className}
            style={style}
        >
            {IDRIVE_MARK.map(d => (
                <path key={d} d={d} />
            ))}
        </svg>
    )
}

// The 8-bar logo is a wordmark (50:21) and must not be squeezed into the
// square icon box (IBM's guidelines forbid distorting it, and letterboxed at
// 14px its bars would blur into a block). `width: auto` overrides the
// caller's w-* class so the height class alone sizes it and the width
// follows the viewBox ratio.
export function IbmLogo({ className, style }: ProviderLogoProps) {
    return (
        <svg
            viewBox="0 0 50 21"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
            data-provider-logo="ibm"
            className={className}
            style={{ ...style, width: 'auto' }}
        >
            <path d={IBM_MARK} />
        </svg>
    )
}
