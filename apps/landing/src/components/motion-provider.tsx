'use client'

import { LazyMotion, MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

const loadFeatures = () =>
    import('@/lib/motion-features').then(mod => mod.default)

/**
 * The landing components render framer-motion's slim `m.*` elements, which
 * carry no animation code of their own; this provider hands them the features
 * once an async chunk arrives. Before, every `motion.*` element pulled the full
 * feature set into the first load of every page (the Navbar's theme toggle
 * alone put it on all 70+ routes).
 *
 * `tests/landing-first-load-guards.test.ts` keeps `motion.*` out of every landing
 * component, docs included (a `motion.*` bundles its own ~90 KB of features into
 * the route's first load), so the saving cannot quietly regress.
 *
 * `MotionConfig reducedMotion="user"` is the JS half of the reduced-motion
 * contract (the CSS half is the net at the bottom of app/globals.css): under
 * `prefers-reduced-motion` every `m.*` drops transform and layout animation
 * and keeps opacity. It is a context provider only, so it adds no feature
 * code to the first load.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={loadFeatures}>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
    )
}
