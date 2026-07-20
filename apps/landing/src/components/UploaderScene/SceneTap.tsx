'use client'

import { AnimatePresence, motion } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// SceneTap — a finger-tap dot the timeline glides around the panel. It reads as
// a touch point rather than a desktop pointer, so the same scenes look right on
// a phone. Positioned by transform (`x`/`y` in px, measured from real target
// rects by the scene) so it never triggers layout in the loop. The animated
// (x,y) is the DOT CENTRE — the halo and inner dot are centred on it with a
// translate(-50%,-50%) inner wrapper (framer-motion owns the motion.div's own
// transform, so the centring lives one level in), and the tap ripple is centred
// on the same point. A press pulse + ripple retrigger by bumping `tapId`.
// Decorative — the whole scene is aria-hidden.
// ─────────────────────────────────────────────────────────────────────────────

interface SceneTapProps {
    /** Pixel position of the tap-dot CENTRE, relative to the scene root. */
    x: number
    y: number
    /** Bump to fire a tap (press pulse + ripple); each new value triggers one. */
    tapId: number
    /** Fade the dot out (glide off before uploading, etc.). */
    hidden?: boolean
    /** Reduced-motion / off-screen: settle instantly, no spring, no pulse/ripple. */
    reduce?: boolean
}

export default function SceneTap({
    x,
    y,
    tapId,
    hidden = false,
    reduce = false,
}: SceneTapProps) {
    return (
        <motion.div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-50"
            initial={false}
            animate={{ x, y, opacity: hidden ? 0 : 1 }}
            transition={
                reduce
                    ? { duration: 0 }
                    : {
                          // Near-critically damped so the dot settles on the
                          // target without overshooting past it before a tap.
                          x: { type: 'spring', stiffness: 180, damping: 24 },
                          y: { type: 'spring', stiffness: 180, damping: 24 },
                          opacity: { duration: 0.3, ease: 'easeInOut' },
                      }
            }
        >
            {/* Inner wrapper carries the centring transform so the dot centre
                lands on the div origin (x,y); framer-motion owns the outer
                transform. Its size is the halo's (26px). */}
            <div
                className="relative"
                style={{ transform: 'translate(-50%, -50%)' }}
            >
                {/* Tap ripple — one expanding ring per tapId bump, centred on the dot. */}
                {!reduce && (
                    <AnimatePresence>
                        <motion.span
                            key={tapId}
                            className="absolute left-1/2 top-1/2 h-[26px] w-[26px] rounded-full border border-sky-300/80"
                            style={{ marginLeft: -13, marginTop: -13 }}
                            initial={{ scale: 0.4, opacity: 0.7 }}
                            animate={{ scale: 2.4, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </AnimatePresence>
                )}

                {/* Soft halo — reads on both the dark panel and light content. */}
                <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/15 shadow-[0_2px_8px_rgba(2,6,23,0.45)] ring-1 ring-white/40">
                    {/* Inner dot — a quick press pulse on each tapId bump. */}
                    <motion.div
                        key={reduce ? undefined : tapId}
                        className="h-2.5 w-2.5 rounded-full bg-white/95"
                        animate={reduce ? {} : { scale: [1, 0.65, 1] }}
                        transition={
                            reduce
                                ? { duration: 0 }
                                : {
                                      duration: 0.32,
                                      times: [0, 0.4, 1],
                                      ease: 'easeOut',
                                  }
                        }
                    />
                </div>
            </div>
        </motion.div>
    )
}
