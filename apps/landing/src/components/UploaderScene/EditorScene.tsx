'use client'

import { motion } from 'framer-motion'
import { FaCrop, FaSyncAlt, FaPen, FaSlidersH } from 'react-icons/fa'
import MockUploader from './MockUploader'
import { useSceneTimeline } from './useSceneTimeline'
import type { TimelineStep } from './useSceneTimeline'

// ─────────────────────────────────────────────────────────────────────────────
// EditorScene — the built-in image editor segment (React & Preact only): a photo
// opens in the panel's preview with a marching-ants crop marquee, then rotates,
// gets an annotation stroke, and a filter tint — cycling the editor toolbar. The
// editor mounts through MockUploader's overlay slot so it reads as happening
// inside the real product. Decorative: root is aria-hidden; honours
// reduced-motion and the `active` gate via the timeline.
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS = [FaCrop, FaSyncAlt, FaPen, FaSlidersH]

interface EditorState {
    /** Active toolbar tool index (0 crop, 1 rotate, 2 annotate, 3 filter). */
    tool: number
    rotate: number
    annotate: boolean
    filter: boolean
}

const INITIAL: EditorState = {
    tool: 0,
    rotate: 0,
    annotate: false,
    filter: false,
}

// Ascending by `at` (seconds). loop = 9.5s → a brief rest on the filtered frame.
const SCRIPT: TimelineStep<EditorState>[] = [
    { at: 0.5, set: { tool: 0 } },
    { at: 2.6, set: { tool: 1, rotate: -5 } },
    { at: 4.6, set: { tool: 2, annotate: true } },
    { at: 6.6, set: { tool: 3, filter: true } },
]

interface EditorSceneProps {
    active?: boolean
    className?: string
}

export default function EditorScene({
    active = true,
    className = '',
}: EditorSceneProps) {
    const { state, frozen } = useSceneTimeline<EditorState>({
        initial: INITIAL,
        steps: SCRIPT,
        loop: 9.5,
        active,
        name: 'EditorScene',
    })

    return (
        <div
            aria-hidden
            className={`mx-auto w-full max-w-[380px] ${className}`}
        >
            <MockUploader
                stage="idle"
                files={[]}
                showOverlay
                reduce={frozen}
                overlay={<MockImageEditor state={state} reduce={frozen} />}
            />
        </div>
    )
}

// The editor overlay: a placeholder photo with the crop marquee, an annotation
// stroke, a filter tint, and the crop/rotate/annotate/adjust toolbar.
function MockImageEditor({
    state,
    reduce,
}: {
    state: EditorState
    reduce: boolean
}) {
    const { tool, rotate, annotate, filter } = state

    return (
        <div className="flex h-full flex-col gap-3 rounded-xl bg-[#0b1120] p-3 ring-1 ring-white/10">
            {/* Preview */}
            <div className="relative flex-1 overflow-hidden rounded-lg">
                <motion.div
                    className="absolute inset-0"
                    animate={{ rotate }}
                    transition={
                        reduce
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 120, damping: 18 }
                    }
                    style={{ transformOrigin: 'center' }}
                >
                    <svg
                        viewBox="0 0 224 160"
                        className="h-full w-full"
                        preserveAspectRatio="xMidYMid slice"
                        aria-hidden="true"
                    >
                        <defs>
                            <linearGradient
                                id="editor-sky"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stopColor="#7dd3fc" />
                                <stop offset="100%" stopColor="#fef3c7" />
                            </linearGradient>
                        </defs>
                        <rect
                            width="224"
                            height="160"
                            fill="url(#editor-sky)"
                        />
                        <circle cx="170" cy="46" r="18" fill="#fbbf24" />
                        <path
                            d="M0 160 L70 78 L120 130 L160 96 L224 160 Z"
                            fill="#4d7c4f"
                        />
                        <path d="M0 160 L54 108 L104 160 Z" fill="#3f6b41" />
                    </svg>
                </motion.div>

                {/* Warm filter tint (adjust tool). */}
                <motion.span
                    className="absolute inset-0 bg-gradient-to-br from-orange-400/30 to-fuchsia-500/25 mix-blend-overlay"
                    initial={false}
                    animate={{ opacity: filter ? 1 : 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.5 }}
                />

                {/* Annotation stroke (pen tool). */}
                <svg
                    viewBox="0 0 224 160"
                    className="absolute inset-0 h-full w-full"
                    aria-hidden="true"
                >
                    <motion.path
                        d="M48 118 C74 92, 104 132, 138 96"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="4"
                        strokeLinecap="round"
                        initial={false}
                        animate={{ pathLength: annotate ? 1 : 0 }}
                        transition={
                            reduce ? { duration: 0 } : { duration: 0.7 }
                        }
                    />
                </svg>

                {/* Crop marquee (marching ants). */}
                <motion.svg
                    viewBox="0 0 224 160"
                    className="absolute inset-0 h-full w-full"
                    aria-hidden="true"
                    animate={
                        reduce || tool !== 0
                            ? { scale: 1 }
                            : { scale: [1, 0.88, 0.88, 1] }
                    }
                    transition={
                        reduce || tool !== 0
                            ? { duration: 0 }
                            : {
                                  duration: 4,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                              }
                    }
                    style={{ transformOrigin: 'center' }}
                >
                    <motion.rect
                        x="26"
                        y="22"
                        width="172"
                        height="116"
                        rx="4"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeDasharray="6 5"
                        animate={
                            reduce ? undefined : { strokeDashoffset: [0, -44] }
                        }
                        transition={
                            reduce
                                ? undefined
                                : {
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: 'linear',
                                  }
                        }
                    />
                </motion.svg>
            </div>

            {/* Toolbar — highlights the active tool. */}
            <div className="flex items-center justify-center gap-2">
                {TOOLS.map((Icon, i) => {
                    const on = i === tool
                    return (
                        <motion.span
                            key={i}
                            className="flex h-7 w-7 items-center justify-center rounded-lg ring-1"
                            animate={{
                                backgroundColor: on
                                    ? 'rgba(56,189,248,0.18)'
                                    : 'rgba(255,255,255,0.04)',
                                boxShadow: on
                                    ? '0 0 0 1px rgba(56,189,248,0.6)'
                                    : '0 0 0 1px rgba(255,255,255,0.08)',
                            }}
                            transition={
                                reduce ? { duration: 0 } : { duration: 0.25 }
                            }
                        >
                            <Icon
                                className={`h-3.5 w-3.5 ${on ? 'text-sky-300' : 'text-gray-400'}`}
                            />
                        </motion.span>
                    )
                })}
            </div>
        </div>
    )
}
