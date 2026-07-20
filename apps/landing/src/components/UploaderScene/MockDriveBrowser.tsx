'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FaCheck, FaFolderOpen, FaPlay } from 'react-icons/fa'
import { SCENE_MEDIA } from './scene-media'
import type { DriveProvider, DriveThumb } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// MockDriveBrowser — a marketing recreation of the real DriveBrowser overlay
// (provider header + user chip + logout, a scrollable photo grid, a footer with
// the blue "Add N files" button). Thumbs are real stock images; one tile plays a
// muted looping video clip. The first `selectedCount` are shown selected with a
// checkmark, mirroring how the real browser marks picks. Slots over the panel
// body inside MockUploader.
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
                    <img
                        src={SCENE_MEDIA.photos.portrait}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover ring-1 ring-white/20"
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
                            data-scene-target={`thumb-${i}`}
                            className="relative aspect-[4/3] overflow-hidden rounded-lg ring-1"
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
                            <ThumbMedia thumb={thumb} reduce={reduce} />
                            {/* Soft photo sheen */}
                            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-white/10" />
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
                <span
                    data-scene-target="drive-add"
                    className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                    {selectedCount === 0
                        ? 'Select files'
                        : `Add ${selectedCount} ${selectedCount === 1 ? 'file' : 'files'}`}
                </span>
                <span className="text-xs font-medium text-gray-400">
                    Cancel
                </span>
            </div>
        </div>
    )
}

// A single grid tile's media: a still stock image, or — when the thumb carries a
// `video` — a muted looping clip that plays only while the scene is live
// (`!reduce`), with a centred play glyph and a duration badge.
function ThumbMedia({ thumb, reduce }: { thumb: DriveThumb; reduce: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const el = videoRef.current
        if (!el) return
        if (reduce) {
            el.pause()
        } else {
            // Autoplay can reject (e.g. not-yet-allowed) — a muted decorative
            // loop, so swallow it.
            void el.play().catch(() => {})
        }
    }, [reduce])

    if (thumb.video) {
        return (
            <>
                <video
                    ref={videoRef}
                    src={thumb.video.src}
                    poster={thumb.video.poster}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/30">
                        <FaPlay className="ml-0.5 h-2 w-2" />
                    </span>
                </span>
                <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[9px] font-medium tabular-nums text-white">
                    {thumb.video.duration}
                </span>
            </>
        )
    }

    return (
        <img
            src={thumb.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
        />
    )
}
