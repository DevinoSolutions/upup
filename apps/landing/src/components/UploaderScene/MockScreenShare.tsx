'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FaLock } from 'react-icons/fa'
import { SCENE_MEDIA } from './scene-media'

// ─────────────────────────────────────────────────────────────────────────────
// MockScreenShare — the overlay the hero movie slides up when the "Screen" source
// is tapped: a mock browser-tab window that is being shared, with the REAL screen
// capture clip playing inside. Mirrors MockDriveBrowser's chrome (dark card,
// window header, footer action) so the two overlays read as one product. The clip
// plays only while the scene is live (`!reduce`) — same muted/looping decorative
// pattern as MockDriveBrowser's ThumbMedia. Slots over the panel body inside
// MockUploader; the footer's "Stop sharing" pill is the cursor's tap target.
// ─────────────────────────────────────────────────────────────────────────────

interface MockScreenShareProps {
    /** Reduced-motion / off-screen: pause the clip, freeze the REC pulse. */
    reduce?: boolean
}

export default function MockScreenShare({
    reduce = false,
}: MockScreenShareProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const el = videoRef.current
        if (!el) return
        if (reduce) {
            el.pause()
        } else {
            // Autoplay can reject (not-yet-allowed) — a muted decorative loop, so
            // swallow it.
            void el.play().catch(() => {})
        }
    }, [reduce])

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#0b1120] ring-1 ring-white/10">
            {/* Shared-tab window chrome */}
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] text-gray-300 ring-1 ring-white/10">
                    <FaLock className="h-2.5 w-2.5 shrink-0 text-gray-400" />
                    <span className="truncate">app.useupup.com</span>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-red-400">
                    <motion.span
                        className="h-2 w-2 rounded-full bg-red-500"
                        animate={reduce ? {} : { opacity: [1, 0.3, 1] }}
                        transition={
                            reduce
                                ? { duration: 0 }
                                : {
                                      duration: 1.4,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                  }
                        }
                    />
                    REC
                </span>
            </div>

            {/* Body — the real screen-capture clip. min-h-0 flex-1 so it fills the
                fixed body height without overflowing it. */}
            <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                <video
                    ref={videoRef}
                    src={SCENE_MEDIA.videos.screenShare.src}
                    poster={SCENE_MEDIA.videos.screenShare.poster}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            {/* Footer — the "Stop sharing" pill is the cursor's tap target */}
            <div className="flex items-center gap-3 border-t border-white/10 bg-white/[0.04] px-3 py-2">
                <span
                    data-scene-target="screen-stop"
                    className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                    Stop sharing
                </span>
                <span className="text-xs font-medium text-gray-400">
                    Sharing screen
                </span>
            </div>
        </div>
    )
}
