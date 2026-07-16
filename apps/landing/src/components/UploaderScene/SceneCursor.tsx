'use client'

import { AnimatePresence, motion } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// SceneCursor — a soft, glossy pointer the timeline glides around the panel.
// Positioned by transform (`x`/`y` in px, measured from real target rects by the
// scene) so it never triggers layout in the loop. The animated (x,y) addresses
// the arrow's visual TIP, not the glyph box's corner: the tip of the 22px glyph
// sits ~(4.4, 2.4)px inside it (path starts at 4,2.2 in a 20-unit viewBox scaled
// ×1.1), so the glyph is shifted by that offset and the click ripple is centred
// on the same tip point — clicks land exactly where the pointer points. A ripple
// is retriggered by bumping `clickId`. Decorative — the whole scene is aria-hidden.
// ─────────────────────────────────────────────────────────────────────────────

// The arrow glyph's tip, in rendered pixels, relative to the glyph box corner.
const TIP_X = 4.4
const TIP_Y = 2.4

interface SceneCursorProps {
    /** Pixel position of the arrow TIP, relative to the scene root. */
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
                          // Near-critically damped so the tip settles on the
                          // target without overshooting past it before a click.
                          x: { type: 'spring', stiffness: 180, damping: 24 },
                          y: { type: 'spring', stiffness: 180, damping: 24 },
                          opacity: { duration: 0.3, ease: 'easeInOut' },
                      }
            }
        >
            {/* Click ripple — centred on the tip (the div's transform origin),
                expands and fades on each clickId bump. */}
            {!reduce && (
                <AnimatePresence>
                    <motion.span
                        key={clickId}
                        className="absolute h-5 w-5 rounded-full border border-sky-300/80"
                        style={{ left: -10, top: -10 }}
                        initial={{ scale: 0.3, opacity: 0.7 }}
                        animate={{ scale: 2.6, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                    />
                </AnimatePresence>
            )}

            {/* Pointer glyph — shifted so its tip lands on the div origin (x,y). */}
            <svg
                width="22"
                height="22"
                viewBox="0 0 20 20"
                fill="none"
                className="drop-shadow-[0_2px_6px_rgba(2,6,23,0.55)]"
                style={{ transform: `translate(${-TIP_X}px, ${-TIP_Y}px)` }}
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
