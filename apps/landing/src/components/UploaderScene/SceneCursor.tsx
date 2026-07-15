'use client'

import { AnimatePresence, motion } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// SceneCursor — a soft, glossy pointer the timeline glides around the panel.
// Positioned by transform (`x`/`y` in px, computed from percent coords by the
// scene) so it never triggers layout in the loop. A click ripple is retriggered
// by bumping `clickId`. Decorative — the whole scene tree is aria-hidden.
// ─────────────────────────────────────────────────────────────────────────────

interface SceneCursorProps {
    /** Pixel offset from the panel's top-left (already mapped from percent). */
    x: number
    y: number
    /** Bump to fire a click ripple; each new value triggers one ripple. */
    clickId: number
    /** Fade the cursor out (glide off before uploading, etc.). */
    hidden?: boolean
    /** Reduced-motion / off-screen: settle instantly, no spring, no ripple. */
    reduce?: boolean
}

export default function SceneCursor({
    x,
    y,
    clickId,
    hidden = false,
    reduce = false,
}: SceneCursorProps) {
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
                          x: { type: 'spring', stiffness: 140, damping: 20 },
                          y: { type: 'spring', stiffness: 140, damping: 20 },
                          opacity: { duration: 0.35, ease: 'easeInOut' },
                      }
            }
        >
            {/* Click ripple — a ring that expands and fades on each clickId bump. */}
            {!reduce && (
                <AnimatePresence>
                    <motion.span
                        key={clickId}
                        className="absolute -left-1 -top-1 h-5 w-5 rounded-full border border-sky-300/80"
                        initial={{ scale: 0.3, opacity: 0.7 }}
                        animate={{ scale: 2.6, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                    />
                </AnimatePresence>
            )}

            {/* Pointer glyph — a classic arrow with a subtle glow. */}
            <svg
                width="22"
                height="22"
                viewBox="0 0 20 20"
                fill="none"
                className="drop-shadow-[0_2px_6px_rgba(2,6,23,0.55)]"
            >
                <path
                    d="M4 2.2 L4 15.4 L7.7 11.9 L10.4 17.6 L12.8 16.5 L10.1 11 L15.2 11 Z"
                    fill="white"
                    stroke="#0f172a"
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                />
            </svg>
        </motion.div>
    )
}
