'use client'

import { LazyMotion } from 'framer-motion'
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
 * Not `strict`: the docs components still use `motion.*`, which keeps working
 * inside LazyMotion and simply bundles its own features on those routes.
 * `tests/landing-first-load-guards.test.ts` keeps `motion.*` out of the landing
 * components so the saving cannot quietly regress.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
    return <LazyMotion features={loadFeatures}>{children}</LazyMotion>
}
