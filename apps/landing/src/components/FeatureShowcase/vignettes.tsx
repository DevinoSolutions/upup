'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FaGlobe, FaServer, FaShieldAlt } from 'react-icons/fa'
import { SiAmazonwebservices } from 'react-icons/si'

// ─────────────────────────────────────────────────────────────────────────────
// ServerModeVignette — the one remaining diagram vignette (the other five
// feature visuals are now UploaderScene segments). A pure JSX/SVG/framer-motion
// loop showing Browser → Your Server (HMAC-signed) → S3, with signed packets
// flowing through and an unsigned one bounced back with a 403. Gentle, reads in
// both themes, and honors prefers-reduced-motion (static final frame) plus the
// row's `active` viewport gate.
// ─────────────────────────────────────────────────────────────────────────────

interface VignetteProps {
    // Animate only while the row is in the viewport; when false the vignette is
    // treated exactly like reduced-motion (static final frame, no intervals).
    active?: boolean
}

export function ServerModeVignette({ active = true }: VignetteProps) {
    const reduceMotion = useReducedMotion()
    const reduce = reduceMotion || !active

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
