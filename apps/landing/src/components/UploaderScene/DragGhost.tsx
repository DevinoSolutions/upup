'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { FaRegFolderOpen } from 'react-icons/fa'

// ─────────────────────────────────────────────────────────────────────────────
// DragGhost — the "thing being dragged" the timeline glides across the panel: the
// drag analogue of SceneTap. A small tilted card (a file thumb + name, or a
// folder glyph + a "N files" sub-badge) that springs between MEASURED waypoints
// exactly like the cursor, so the same measure(waypoint) pattern positions it.
// Two layers, mirroring SceneTap: the OUTER motion.div owns the (x,y) position
// transform (framer-motion springs it — no layout in the loop); an inner wrapper
// carries the translate(-50%,-50%) centring so (x,y) is the card CENTRE. The card
// itself lives inside an AnimatePresence keyed on `visible` — it enters from
// slightly above (fade + scale) and, when it hides at a drop, plays its exit as a
// landing pulse (scale down + fade); the row popping into the queue is the
// "landing". `dropId` bumps in lockstep with the hide so each drop replays.
// `reduce` (reduced motion / off-viewport) hides it entirely — the frozen final
// frame has no drag in flight. Decorative — the whole scene root is aria-hidden.
// ─────────────────────────────────────────────────────────────────────────────

interface DragGhostProps {
    kind: 'file' | 'folder'
    /** Pixel position of the card CENTRE, relative to the scene root. */
    x: number
    y: number
    /** Card is in flight (a drag is happening); false plays the drop/hide. */
    visible: boolean
    /** Bumped on each drop so the landing pulse replays. */
    dropId: number
    /** Name label ("street-market.jpg" / "assets/"). */
    label: string
    /** Thumbnail for the `file` kind. */
    thumb?: string
    /** Reduced-motion / off-screen: settle instantly and stay hidden. */
    reduce?: boolean
}

// Near-critically damped, same as SceneTap — the card settles on the drop target
// without overshooting before it lands.
const GLIDE = { type: 'spring', stiffness: 180, damping: 24 } as const

export default function DragGhost({
    kind,
    x,
    y,
    visible,
    dropId,
    label,
    thumb,
    reduce = false,
}: DragGhostProps) {
    return (
        <motion.div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-40"
            initial={false}
            animate={{ x, y }}
            transition={reduce ? { duration: 0 } : { x: GLIDE, y: GLIDE }}
        >
            {/* Centring wrapper — the card centre lands on the div origin (x,y);
                framer-motion owns the outer transform. */}
            <div
                className="relative"
                style={{ transform: 'translate(-50%, -50%)' }}
            >
                <AnimatePresence>
                    {visible && (
                        <motion.div
                            // key by dropId so a fresh grab after a drop replays
                            // the enter rather than reusing the exiting element.
                            key={dropId}
                            initial={
                                reduce
                                    ? false
                                    : { opacity: 0, scale: 0.9, y: -12 }
                            }
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={
                                reduce
                                    ? { opacity: 0 }
                                    : { opacity: 0, scale: 0.6 }
                            }
                            transition={
                                reduce
                                    ? { duration: 0 }
                                    : {
                                          type: 'spring',
                                          stiffness: 260,
                                          damping: 22,
                                      }
                            }
                        >
                            {/* Tilt lives on a plain child so it composes with —
                                rather than fights — framer's inline transform. */}
                            <div className="rotate-3">
                                <div className="flex items-center gap-2.5 rounded-lg bg-[#1a2338]/95 px-3 py-2.5 shadow-xl ring-1 ring-white/15 backdrop-blur">
                                    {kind === 'folder' ? (
                                        <>
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-500/15 ring-1 ring-white/10">
                                                <FaRegFolderOpen className="h-4 w-4 text-sky-300" />
                                            </span>
                                            <span className="flex flex-col leading-tight">
                                                <span className="text-xs font-medium text-gray-100">
                                                    {label}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    2 files
                                                </span>
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-md bg-white/10">
                                                {thumb && (
                                                    <img
                                                        src={thumb}
                                                        alt=""
                                                        className="absolute inset-0 h-full w-full object-cover"
                                                    />
                                                )}
                                            </span>
                                            <span className="text-xs font-medium text-gray-100">
                                                {label}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
