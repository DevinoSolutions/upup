'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    FaUpload,
    FaCamera,
    FaDesktop,
    FaGlobe,
    FaServer,
    FaShieldAlt,
    FaCrop,
    FaSyncAlt,
    FaPen,
    FaSlidersH,
    FaCheck,
} from 'react-icons/fa'
import {
    SiGoogledrive,
    SiDropbox,
    SiBox,
    SiAmazonwebservices,
} from 'react-icons/si'
import { GrOnedrive } from 'react-icons/gr'
import { FRAMEWORK_LIST } from '@/lib/frameworks'

// ─────────────────────────────────────────────────────────────────────────────
// Feature vignettes — self-contained, pure JSX/CSS/SVG/framer-motion loops that
// SHOW each feature (no images, no screenshots). Every loop is gentle (~6–10s),
// reads in both themes, and honors prefers-reduced-motion by rendering the
// static final frame instead of the animation (via useReducedMotion()).
// ─────────────────────────────────────────────────────────────────────────────

// Shared: a small dropzone/uploader panel mock reused as a visual anchor.
function PanelMock({ children }: { children?: React.ReactNode }) {
    return (
        <div className="w-[280px] rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] p-4 shadow-sm">
            {children}
        </div>
    )
}

// 1. Six Frameworks, One Uploader ─────────────────────────────────────────────
// A pixel-identical uploader panel mock while a framework badge cycles in the
// corner — the message: same DOM, any framework.
export function FrameworksVignette() {
    const reduce = useReducedMotion()
    const [idx, setIdx] = useState(0)

    useEffect(() => {
        if (reduce) return
        const t = setInterval(
            () => setIdx(i => (i + 1) % FRAMEWORK_LIST.length),
            1600,
        )
        return () => clearInterval(t)
    }, [reduce])

    const fw = FRAMEWORK_LIST[idx]

    return (
        <div className="relative">
            <PanelMock>
                {/* Corner framework chip */}
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-white/20" />
                        <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-white/20" />
                        <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-white/20" />
                    </div>
                    <div className="relative h-6 w-24 overflow-hidden">
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={fw.id}
                                className="absolute inset-0 inline-flex items-center justify-end gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200"
                                initial={reduce ? false : { y: 12, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={
                                    reduce ? undefined : { y: -12, opacity: 0 }
                                }
                                transition={{ duration: 0.35 }}
                            >
                                <fw.Icon
                                    className="h-3.5 w-3.5"
                                    style={{ color: fw.brand }}
                                />
                                {fw.name}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Dropzone outline */}
                <div className="mb-3 flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-white/15 text-gray-400 dark:text-gray-500">
                    <FaUpload className="h-5 w-5" />
                </div>

                {/* File row + progress */}
                <div className="rounded-lg bg-white dark:bg-white/[0.04] p-2.5 shadow-sm">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="h-6 w-6 rounded bg-primary/15 dark:bg-primary-dark/20" />
                        <span className="h-2 flex-1 rounded bg-gray-200 dark:bg-white/10" />
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                        <motion.div
                            className="h-full rounded-full bg-primary dark:bg-primary-dark"
                            initial={{ width: reduce ? '72%' : '20%' }}
                            animate={{
                                width: reduce ? '72%' : ['20%', '72%', '20%'],
                            }}
                            transition={
                                reduce
                                    ? undefined
                                    : {
                                          duration: 6,
                                          repeat: Infinity,
                                          ease: 'easeInOut',
                                      }
                            }
                        />
                    </div>
                </div>
            </PanelMock>
        </div>
    )
}

// 2. Cloud Drives, Camera & Screen Capture ────────────────────────────────────
// Source glyphs arranged around a central dropzone; dots travel inward and the
// dropzone pulses on arrival.
const SOURCES = [
    { Icon: SiGoogledrive, color: '#4285F4', x: 8, y: 14 },
    { Icon: GrOnedrive, color: '#0078D4', x: 118, y: 0 },
    { Icon: SiDropbox, color: '#0061FF', x: 228, y: 14 },
    { Icon: FaCamera, color: '#8b5cf6', x: 0, y: 96 },
    { Icon: SiBox, color: '#0061D5', x: 236, y: 96 },
    { Icon: FaDesktop, color: '#0ea5e9', x: 118, y: 118 },
]

export function SourcesVignette() {
    const reduce = useReducedMotion()
    const center = { x: 118, y: 62 }

    return (
        <div className="relative h-[176px] w-[268px]">
            {/* Central dropzone */}
            <motion.div
                className="absolute z-10 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary/40 dark:border-primary-dark/40 bg-primary/10 dark:bg-primary-dark/15 text-primary dark:text-primary-dark"
                style={{ left: center.x, top: center.y }}
                animate={reduce ? undefined : { scale: [1, 1.1, 1] }}
                transition={
                    reduce
                        ? undefined
                        : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                }
            >
                <FaUpload className="h-5 w-5" />
            </motion.div>

            {SOURCES.map((s, i) => (
                <React.Fragment key={i}>
                    {/* Source glyph */}
                    <div
                        className="absolute flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-white/[0.06] shadow-sm ring-1 ring-gray-200 dark:ring-white/10"
                        style={{ left: s.x, top: s.y }}
                    >
                        <s.Icon
                            className="h-4 w-4"
                            style={{ color: s.color }}
                        />
                    </div>
                    {/* Travelling dot */}
                    {!reduce && (
                        <motion.span
                            className="absolute z-20 h-2 w-2 rounded-full"
                            style={{
                                left: s.x + 12,
                                top: s.y + 12,
                                backgroundColor: s.color,
                            }}
                            animate={{
                                x: [0, center.x + 16 - s.x],
                                y: [0, center.y + 16 - s.y],
                                opacity: [0, 1, 1, 0],
                                scale: [0.6, 1, 1, 0.4],
                            }}
                            transition={{
                                duration: 2.4,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: i * 0.4,
                            }}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}

// 3. Secure Server Mode ───────────────────────────────────────────────────────
// Browser → Your Server (HMAC-signed) → S3, with signed packets flowing through
// and an unsigned one bounced back with a 403.
export function ServerModeVignette() {
    const reduce = useReducedMotion()

    return (
        <div className="w-full max-w-[320px]">
            <div className="flex items-center justify-between gap-2">
                {/* Browser */}
                <Node label="Browser" icon={<FaGlobe className="h-5 w-5" />} />

                {/* Hop 1 */}
                <Track>
                    {!reduce && <Packet color="#22c55e" delay={0} />}
                    {!reduce && (
                        // Unsigned packet bounces back with a 403.
                        <motion.span
                            className="absolute top-1/2 left-0 -translate-y-1/2 rounded bg-red-500 px-1 text-[8px] font-bold text-white"
                            animate={{ x: [0, 26, 0], opacity: [0, 1, 0] }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: 1.4,
                            }}
                        >
                            403
                        </motion.span>
                    )}
                </Track>

                {/* Your Server */}
                <Node
                    label="Your Server"
                    icon={
                        <span className="relative">
                            <FaServer className="h-5 w-5" />
                            <FaShieldAlt className="absolute -bottom-1 -right-1 h-3 w-3 text-green-500" />
                        </span>
                    }
                    tag="HMAC-signed"
                />

                {/* Hop 2 */}
                <Track>
                    {!reduce && <Packet color="#22c55e" delay={0.8} />}
                </Track>

                {/* S3 */}
                <Node
                    label="S3"
                    icon={
                        <SiAmazonwebservices className="h-5 w-5 text-[#FF9900]" />
                    }
                />
            </div>

            {/* Adapter chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
                {['Express', 'Fastify', 'Hono', 'Next.js'].map(a => (
                    <span
                        key={a}
                        className="rounded-full bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-white/10"
                    >
                        {a}
                    </span>
                ))}
            </div>
        </div>
    )
}

function Node({
    label,
    icon,
    tag,
}: {
    label: string
    icon: React.ReactNode
    tag?: string
}) {
    return (
        <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 shadow-sm">
                {icon}
            </div>
            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                {label}
            </span>
            {tag && (
                <span className="rounded bg-green-100 dark:bg-green-900/30 px-1 text-[8px] font-medium text-green-700 dark:text-green-300">
                    {tag}
                </span>
            )}
        </div>
    )
}

function Track({ children }: { children?: React.ReactNode }) {
    return (
        <div className="relative h-6 flex-1">
            <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-gray-300 dark:bg-white/15" />
            {children}
        </div>
    )
}

function Packet({ color, delay }: { color: string; delay: number }) {
    return (
        <motion.span
            className="absolute top-1/2 left-0 h-2 w-2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: color }}
            animate={{ x: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
                delay,
            }}
        />
    )
}

// 4. Built-In Image Editor (React & Preact) ───────────────────────────────────
// A placeholder photo with a marching-ants crop marquee that draws, then the
// crop snaps in; a small editor toolbar sits beneath.
export function EditorVignette() {
    const reduce = useReducedMotion()

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative h-40 w-56 overflow-hidden rounded-xl">
                {/* Placeholder photo: gradient sky + sun + mountains */}
                <svg
                    viewBox="0 0 224 160"
                    className="absolute inset-0 h-full w-full"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7dd3fc" />
                            <stop offset="100%" stopColor="#fef3c7" />
                        </linearGradient>
                    </defs>
                    <rect width="224" height="160" fill="url(#sky)" />
                    <circle cx="170" cy="46" r="18" fill="#fbbf24" />
                    <path
                        d="M0 160 L70 78 L120 130 L160 96 L224 160 Z"
                        fill="#4d7c4f"
                    />
                    <path d="M0 160 L54 108 L104 160 Z" fill="#3f6b41" />
                </svg>

                {/* Crop marquee (marching ants) */}
                <motion.svg
                    viewBox="0 0 224 160"
                    className="absolute inset-0 h-full w-full"
                    aria-hidden="true"
                    animate={
                        reduce ? undefined : { scale: [1, 1, 0.86, 0.86, 1] }
                    }
                    transition={
                        reduce
                            ? undefined
                            : {
                                  duration: 7,
                                  repeat: Infinity,
                                  times: [0, 0.4, 0.55, 0.85, 1],
                                  ease: 'easeInOut',
                              }
                    }
                    style={{ transformOrigin: 'center' }}
                >
                    <motion.rect
                        x="28"
                        y="24"
                        width="168"
                        height="112"
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

            {/* Toolbar */}
            <div className="flex items-center gap-2 rounded-full bg-white dark:bg-white/[0.06] px-3 py-1.5 shadow-sm ring-1 ring-gray-200 dark:ring-white/10">
                {[FaCrop, FaSyncAlt, FaPen, FaSlidersH].map((Icon, i) => (
                    <Icon
                        key={i}
                        className="h-3.5 w-3.5 text-gray-500 dark:text-gray-300"
                    />
                ))}
            </div>
        </div>
    )
}

// 5. Crash-Safe & Resumable ───────────────────────────────────────────────────
// Progress fills to ~62%, a reload flicker blinks the window chrome, then the
// bar resumes from 62% to 100% with a "resumed" tick.
export function ResumeVignette() {
    const reduce = useReducedMotion()

    return (
        <div className="w-[260px] rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] p-4 shadow-sm">
            {/* Window chrome (blinks on reload) */}
            <motion.div
                className="mb-3 flex items-center gap-1.5"
                animate={reduce ? undefined : { opacity: [1, 1, 0.25, 1, 1] }}
                transition={
                    reduce
                        ? undefined
                        : {
                              duration: 8,
                              repeat: Infinity,
                              times: [0, 0.42, 0.5, 0.58, 1],
                              ease: 'easeInOut',
                          }
                }
            >
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-2 h-2 flex-1 rounded bg-gray-200 dark:bg-white/10" />
            </motion.div>

            <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
                <span>large-video.mp4</span>
                <motion.span
                    className="inline-flex items-center gap-1 text-green-600 dark:text-green-400"
                    animate={reduce ? undefined : { opacity: [0, 0, 0, 1, 1] }}
                    transition={
                        reduce
                            ? undefined
                            : {
                                  duration: 8,
                                  repeat: Infinity,
                                  times: [0, 0.6, 0.85, 0.92, 1],
                                  ease: 'easeInOut',
                              }
                    }
                >
                    <FaCheck className="h-3 w-3" /> resumed
                </motion.span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <motion.div
                    className="h-full rounded-full bg-primary dark:bg-primary-dark"
                    initial={{ width: reduce ? '100%' : '0%' }}
                    animate={{
                        width: reduce
                            ? '100%'
                            : ['0%', '62%', '62%', '62%', '100%'],
                    }}
                    transition={
                        reduce
                            ? undefined
                            : {
                                  duration: 8,
                                  repeat: Infinity,
                                  times: [0, 0.4, 0.5, 0.6, 0.9],
                                  ease: 'easeInOut',
                              }
                    }
                />
            </div>
        </div>
    )
}

// 6. Fast by Default: Workers + HEIC ──────────────────────────────────────────
// Left: a .heic chip morphing to .jpg. Right: a flat "main thread" line while a
// "worker" lane does the pulsing.
export function PipelineVignette() {
    const reduce = useReducedMotion()

    return (
        <div className="flex w-full max-w-[320px] items-center justify-around gap-4">
            {/* HEIC → JPG */}
            <div className="flex flex-col items-center gap-2">
                <div className="relative h-10 w-20">
                    <motion.span
                        className="absolute inset-0 flex items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-xs font-bold text-purple-700 dark:text-purple-300"
                        animate={
                            reduce
                                ? { opacity: 0 }
                                : { opacity: [1, 1, 0, 0, 1] }
                        }
                        transition={
                            reduce
                                ? undefined
                                : {
                                      duration: 6,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                  }
                        }
                    >
                        .heic
                    </motion.span>
                    <motion.span
                        className="absolute inset-0 flex items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30 text-xs font-bold text-sky-700 dark:text-sky-300"
                        animate={
                            reduce
                                ? { opacity: 1 }
                                : { opacity: [0, 0, 1, 1, 0] }
                        }
                        transition={
                            reduce
                                ? undefined
                                : {
                                      duration: 6,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                  }
                        }
                    >
                        .jpg
                    </motion.span>
                </div>
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    HEIC → JPEG
                </span>
            </div>

            {/* Thread lanes */}
            <div className="flex flex-col gap-3">
                <div>
                    <span className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        main thread
                    </span>
                    <div className="h-3 w-28 rounded-full bg-green-100 dark:bg-green-900/25">
                        <div className="h-full w-full rounded-full bg-gradient-to-r from-green-400/40 to-green-400/40" />
                    </div>
                </div>
                <div>
                    <span className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        worker
                    </span>
                    <div className="flex h-3 w-28 items-center gap-1">
                        {[0, 1, 2, 3, 4].map(i => (
                            <motion.span
                                key={i}
                                className="h-full flex-1 rounded-sm bg-primary/70 dark:bg-primary-dark/70"
                                animate={
                                    reduce
                                        ? undefined
                                        : {
                                              scaleY: [0.4, 1, 0.4],
                                              opacity: [0.5, 1, 0.5],
                                          }
                                }
                                transition={
                                    reduce
                                        ? undefined
                                        : {
                                              duration: 1.4,
                                              repeat: Infinity,
                                              ease: 'easeInOut',
                                              delay: i * 0.15,
                                          }
                                }
                                style={{ transformOrigin: 'center' }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
