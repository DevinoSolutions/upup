import type { Metadata } from 'next'

// This segment exists ONLY to carry metadata. `page.tsx` is `'use client'`
// (it reads useSearchParams), and a client component cannot export `metadata` —
// so the route was serving 200 HTML with the ROOT layout's title, description
// and og:url, no canonical, and no robots directive.
//
// robots.txt already has `Disallow: /mobile-demo/`, which is the belt, not the
// braces: Disallow blocks CRAWLING, not INDEXING — a URL discovered from an
// external link can still surface as a title-less result under the homepage's
// title, and because crawling is blocked Google would never read a noindex
// META tag either. The `X-Robots-Tag`-equivalent directive emitted here is
// rendered into the HTML at build time, so it applies the moment anything does
// fetch the page. Keep BOTH.
export const metadata: Metadata = {
    robots: { index: false, follow: false },
}

export default function MobileDemoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
