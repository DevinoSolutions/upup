'use client'

import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { FaCheck, FaFolderOpen } from 'react-icons/fa'
import type { DriveProvider, DriveThumb } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// MockDriveBrowser — a marketing recreation of the real DriveBrowser overlay
// (provider header + user chip + logout, a scrollable photo grid, a footer with
// the blue "Add N files" button). Photo thumbs are gradient placeholders; the
// first `selectedCount` are shown selected with a checkmark, mirroring how the
// real browser marks picks. Slots over the panel body inside MockUploader.
// ─────────────────────────────────────────────────────────────────────────────

interface MockDriveBrowserProps {
    provider: DriveProvider
    thumbs: DriveThumb[]
    /** How many leading thumbs read as selected (checkmark + ring). */
    selectedCount: number
    reduce?: boolean
}

export default function MockDriveBrowser({
    provider,
    thumbs,
    selectedCount,
    reduce = false,
}: MockDriveBrowserProps) {
    const { Icon, name, color } = provider

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#0b1120] ring-1 ring-white/10">
            {/* Provider header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <span className="text-xs font-semibold text-white">
                        {name}
                    </span>
                    <span className="ml-1 hidden items-center gap-1 text-[11px] text-gray-400 sm:flex">
                        <FaFolderOpen className="h-3 w-3" /> My Photos
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="h-5 w-5 rounded-full ring-1 ring-white/20"
                        style={{
                            background:
                                'conic-gradient(from 140deg, #38bdf8, #818cf8, #f472b6)',
                        }}
                    />
                    <span className="text-[11px] font-medium text-sky-300">
                        Log out
                    </span>
                </div>
            </div>

            {/* Photo grid */}
            <div className="grid flex-1 grid-cols-3 content-start gap-2 overflow-hidden p-3">
                {thumbs.map((thumb, i) => {
                    const selected = i < selectedCount
                    return (
                        <motion.div
                            key={thumb.id}
                            className={`relative aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br ${thumb.gradient} ring-1`}
                            animate={{
                                boxShadow: selected
                                    ? '0 0 0 2px rgba(56,189,248,0.9)'
                                    : '0 0 0 0 rgba(56,189,248,0)',
                            }}
                            transition={
                                reduce ? { duration: 0 } : { duration: 0.25 }
                            }
                            style={
                                {
                                    '--tw-ring-color': 'rgba(255,255,255,0.12)',
                                } as CSSProperties
                            }
                        >
                            {/* Soft photo sheen */}
                            <span className="absolute inset-0 bg-gradient-to-t from-black/25 to-white/10" />
                            {/* Selection checkmark */}
                            <motion.span
                                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white shadow"
                                initial={false}
                                animate={{
                                    scale: selected ? 1 : 0,
                                    opacity: selected ? 1 : 0,
                                }}
                                transition={
                                    reduce
                                        ? { duration: 0 }
                                        : {
                                              type: 'spring',
                                              stiffness: 400,
                                              damping: 20,
                                          }
                                }
                            >
                                <FaCheck className="h-2.5 w-2.5" />
                            </motion.span>
                        </motion.div>
                    )
                })}
            </div>

            {/* Footer — mirrors the real drive footer's blue add button */}
            <div className="flex items-center gap-3 border-t border-white/10 bg-white/[0.04] px-3 py-2">
                <motion.span
                    className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
                    animate={
                        reduce || selectedCount === 0
                            ? { opacity: 1 }
                            : { opacity: [0.85, 1, 0.85] }
                    }
                    transition={
                        reduce || selectedCount === 0
                            ? { duration: 0 }
                            : { duration: 1.6, repeat: Infinity }
                    }
                >
                    {selectedCount === 0
                        ? 'Select files'
                        : `Add ${selectedCount} ${selectedCount === 1 ? 'file' : 'files'}`}
                </motion.span>
                <span className="text-xs font-medium text-gray-400">
                    Cancel
                </span>
            </div>
        </div>
    )
}
