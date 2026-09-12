'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { InteractiveExampleProps } from '@useupup/interactive-example'

// The live uploader demo is the single heaviest thing on the marketing pages:
// `@useupup/interactive-example` drags in @useupup/react, @useupup/core,
// @mastra/client-js and pako, and all of it used to sit in the initial chunk set
// of `/` and every `/[framework]/` page even though the section starts below the
// fold. It carries no indexable copy (the surrounding section headings are
// server-rendered), so it loads client-side only, and only once the visitor is
// near it.
const InteractiveExampleClient = dynamic(
    () =>
        import('@/components/InteractiveExampleClient').then(
            m => m.InteractiveExampleClient,
        ),
    { ssr: false, loading: () => <DemoPlaceholder /> },
)

// Reserves the demo's box so mounting it does not shift the page.
function DemoPlaceholder() {
    return <div className="min-h-[520px] w-full" aria-hidden="true" />
}

/**
 * Viewport gate around the demo: mount it the first time it comes within 800px
 * of the viewport, and keep it mounted afterwards. An IntersectionObserver is
 * used directly rather than framer's `useInView` so this file pulls in no
 * animation runtime of its own.
 *
 * The lead distance is deliberately generous. The mounted demo is much taller
 * than the reserved placeholder (1564px vs 520px at a 412px viewport), so the
 * growth has to happen while the section is still off-screen — otherwise every
 * visitor scrolling toward it would watch the page below jump.
 */
export default function DeferredInteractiveExample(
    props: InteractiveExampleProps,
) {
    const ref = useRef<HTMLDivElement | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        if (mounted) return
        const el = ref.current
        if (!el) return
        // No IntersectionObserver (very old browser, or a test shim): render
        // the demo rather than hide it.
        if (typeof IntersectionObserver === 'undefined') {
            setMounted(true)
            return
        }
        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    setMounted(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '800px' },
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [mounted])

    return (
        <div ref={ref}>
            {mounted ? (
                <InteractiveExampleClient {...props} />
            ) : (
                <DemoPlaceholder />
            )}
        </div>
    )
}
