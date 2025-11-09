'use client'

import * as gtag from '@/lib/gtag'
import Script from 'next/script'
import { ReactNode, useEffect } from 'react'

export function Providers({ children }: { children: ReactNode }) {
    useEffect(() => {
        const handleRouteChange = (event: Event) => {
            const url = (event as CustomEvent<string>).detail || window.location.pathname
            gtag.pageView(url)
        }

        window.addEventListener('routeChangeComplete', handleRouteChange)

        return () => {
            window.removeEventListener('routeChangeComplete', handleRouteChange)
        }
    }, [])

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
            />
            <Script id="gtag-init" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${gtag.GA_TRACKING_ID}');
                `}
            </Script>
            {children}
        </>
    )
}