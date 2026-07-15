'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    FaCheck,
    FaCloudUploadAlt,
    FaDesktop,
    FaLink,
    FaMicrophone,
    FaRegFolderOpen,
    FaCamera,
} from 'react-icons/fa'
import { SiGoogledrive, SiDropbox, SiBox } from 'react-icons/si'
import { GrOnedrive } from 'react-icons/gr'
import type { QueueFile, QueueStage, SourceDef } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// MockUploader — the panel shell, recreated from @upupjs/react's UploaderPanel /
// SourceSelector / FileList with marketing flair (glossy dark chrome, glow
// accents, springy rows). Dark-chrome in BOTH themes on purpose: the real demo
// preview renders as a dark charcoal device, and a single glossy panel reads as
// an intentional product screenshot floating on either page theme (the radiant
// frame around it — Task 3 — adapts to light/dark). Fully controlled: a scene
// sets `activeSource` / `stage` / `files` / `showBrowser`; no internal timers.
// Decorative — the scene root is aria-hidden.
// ─────────────────────────────────────────────────────────────────────────────

// The signature source row: device / link / camera / audio / screen capture,
// then the four cloud drives the real uploader shows when cloudDrives is set.
const DEFAULT_SOURCES: SourceDef[] = [
    {
        id: 'device',
        name: 'My Device',
        Icon: FaRegFolderOpen,
        color: '#59D1F9',
    },
    { id: 'link', name: 'Link', Icon: FaLink, color: '#f97316' },
    { id: 'camera', name: 'Camera', Icon: FaCamera, color: '#22c55e' },
    { id: 'audio', name: 'Audio', Icon: FaMicrophone, color: '#a855f7' },
    { id: 'screen', name: 'Screen', Icon: FaDesktop, color: '#94a3b8' },
    {
        id: 'google-drive',
        name: 'Drive',
        Icon: SiGoogledrive,
        color: '#4285F4',
    },
    { id: 'one-drive', name: 'OneDrive', Icon: GrOnedrive, color: '#0078D4' },
    { id: 'dropbox', name: 'Dropbox', Icon: SiDropbox, color: '#0061FF' },
    { id: 'box', name: 'Box', Icon: SiBox, color: '#0061D5' },
]

const ACCENT_BAR: Record<QueueFile['accent'], string> = {
    blue: 'bg-blue-400',
    teal: 'bg-teal-400',
    violet: 'bg-violet-400',
    amber: 'bg-amber-400',
    green: 'bg-emerald-400',
    pink: 'bg-pink-400',
}

const ACCENT_THUMB: Record<QueueFile['accent'], string> = {
    blue: 'from-blue-400 to-sky-600',
    teal: 'from-teal-300 to-cyan-600',
    violet: 'from-violet-400 to-indigo-600',
    amber: 'from-amber-300 to-orange-500',
    green: 'from-emerald-300 to-teal-600',
    pink: 'from-pink-400 to-rose-600',
}

interface MockUploaderProps {
    /** Source chip to highlight/press (e.g. 'google-drive'). */
    activeSource?: string | null
    stage: QueueStage
    files: QueueFile[]
    /** Overlay slot (MockDriveBrowser) — slides up over the panel body. */
    showBrowser?: boolean
    browser?: ReactNode
    reduce?: boolean
    className?: string
}

export default function MockUploader({
    activeSource = null,
    stage,
    files,
    showBrowser = false,
    browser,
    reduce = false,
    className = '',
}: MockUploaderProps) {
    const hasQueue = stage !== 'idle'

    return (
        <div
            data-upup-slot="mock-uploader"
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141b2e] to-[#0a0e1a] shadow-[0_24px_70px_-24px_rgba(2,6,23,0.85)] ring-1 ring-white/10 ${className}`}
        >
            {/* Lit-from-above sheen */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.08] to-transparent"
            />

            <div className="relative flex flex-col gap-4 p-4 sm:p-5">
                {/* Source row */}
                <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-3 sm:gap-x-5">
                    {DEFAULT_SOURCES.map(source => {
                        const active = activeSource === source.id
                        return (
                            <motion.div
                                key={source.id}
                                className="flex w-12 flex-col items-center gap-1"
                                animate={{ scale: active ? 0.9 : 1 }}
                                transition={
                                    reduce
                                        ? { duration: 0 }
                                        : {
                                              type: 'spring',
                                              stiffness: 380,
                                              damping: 18,
                                          }
                                }
                            >
                                <motion.span
                                    className="flex h-9 w-9 items-center justify-center rounded-xl ring-1"
                                    animate={{
                                        backgroundColor: active
                                            ? 'rgba(56,189,248,0.16)'
                                            : 'rgba(255,255,255,0.04)',
                                        boxShadow: active
                                            ? '0 0 0 1px rgba(56,189,248,0.6), 0 6px 18px -6px rgba(56,189,248,0.6)'
                                            : '0 0 0 1px rgba(255,255,255,0.08)',
                                    }}
                                    transition={
                                        reduce
                                            ? { duration: 0 }
                                            : { duration: 0.25 }
                                    }
                                >
                                    <source.Icon
                                        className="h-4 w-4"
                                        style={{ color: source.color }}
                                    />
                                </motion.span>
                                <span className="text-[10px] font-medium text-gray-400">
                                    {source.name}
                                </span>
                            </motion.div>
                        )
                    })}
                </div>

                {/* Body — dropzone OR file queue, fixed height (panel doesn't grow).
                    The dropzone crossfades and the queue rows stay DIRECT children
                    of a persistent AnimatePresence, so on the loop-wrap "clear the
                    panel" beat each row plays its exit variant instead of snapping. */}
                <div className="relative min-h-[196px]">
                    <AnimatePresence>
                        {!hasQueue && (
                            <motion.div
                                key="dropzone"
                                className="absolute inset-0"
                                initial={reduce ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={
                                    reduce ? { duration: 0 } : { duration: 0.3 }
                                }
                            >
                                <Dropzone />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="flex flex-col gap-2">
                        <AnimatePresence initial={false}>
                            {hasQueue &&
                                files.map((file, i) => (
                                    <FileRow
                                        key={file.id}
                                        file={file}
                                        index={i}
                                        stage={stage}
                                        reduce={reduce}
                                    />
                                ))}
                        </AnimatePresence>
                    </div>

                    {/* Drive-browser overlay — slides up over the panel body */}
                    <AnimatePresence>
                        {showBrowser && browser && (
                            <motion.div
                                className="absolute inset-0 z-30"
                                initial={
                                    reduce ? false : { y: '18%', opacity: 0 }
                                }
                                animate={{ y: 0, opacity: 1 }}
                                exit={
                                    reduce
                                        ? { opacity: 0 }
                                        : { y: '12%', opacity: 0 }
                                }
                                transition={
                                    reduce
                                        ? { duration: 0 }
                                        : {
                                              type: 'spring',
                                              stiffness: 260,
                                              damping: 30,
                                          }
                                }
                            >
                                {browser}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer — upup logo left, "Built by devino" right */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-sky-400">
                        <FaCloudUploadAlt className="h-4 w-4" />
                        upup
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        Built by
                        <span className="font-semibold text-gray-300">
                            devino
                        </span>
                    </span>
                </div>
            </div>
        </div>
    )
}

// The empty-state dropzone, matching the real "Drag your files or browse files"
// copy + limits caption + dashed frame.
function Dropzone() {
    return (
        <div className="flex h-full min-h-[196px] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.015] px-6 text-center">
            <FaCloudUploadAlt className="mb-3 h-8 w-8 text-sky-400/70" />
            <p className="text-sm text-white">
                Drag your files or{' '}
                <span className="font-semibold text-sky-400">browse files</span>
            </p>
            <p className="mt-1.5 max-w-[19rem] text-xs leading-relaxed text-gray-400">
                Add your documents here — up to 10 files, 1 GB max each.
            </p>
        </div>
    )
}

function FileRow({
    file,
    index,
    stage,
    reduce,
}: {
    file: QueueFile
    index: number
    stage: QueueStage
    reduce: boolean
}) {
    const compressed =
        stage === 'compress' || stage === 'uploading' || stage === 'done'
    const uploading = stage === 'uploading' || stage === 'done'
    const done = stage === 'done'
    const badge = file.convertFrom
        ? compressed
            ? file.convertTo
            : file.convertFrom
        : `.${file.ext}`

    return (
        <motion.div
            className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-2.5 ring-1 ring-white/[0.06]"
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={
                reduce
                    ? { duration: 0 }
                    : {
                          type: 'spring',
                          stiffness: 320,
                          damping: 26,
                          delay: index * 0.12,
                      }
            }
        >
            {/* Thumbnail */}
            <div
                className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-gradient-to-br ${ACCENT_THUMB[file.accent]}`}
            >
                <span className="absolute inset-0 bg-gradient-to-t from-black/25 to-white/10" />
            </div>

            {/* Name + progress */}
            <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-gray-200">
                            {file.name}
                        </span>
                        {/* Type badge — morphs on HEIC → JPG rows */}
                        <span className="relative inline-flex h-4 min-w-[2.4rem] items-center justify-center rounded bg-white/10 px-1 text-[9px] font-semibold uppercase text-gray-300">
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span
                                    key={badge}
                                    initial={
                                        reduce ? false : { y: 6, opacity: 0 }
                                    }
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={
                                        reduce
                                            ? { opacity: 0 }
                                            : { y: -6, opacity: 0 }
                                    }
                                    transition={{ duration: 0.25 }}
                                >
                                    {badge}
                                </motion.span>
                            </AnimatePresence>
                        </span>
                    </span>

                    {/* Right: size (morphs on compress) or done tick */}
                    <span className="flex shrink-0 items-center gap-1.5">
                        <SizeText
                            file={file}
                            compressed={compressed}
                            reduce={reduce}
                        />
                        <motion.span
                            className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white"
                            initial={false}
                            animate={{
                                scale: done ? 1 : 0,
                                opacity: done ? 1 : 0,
                            }}
                            transition={
                                reduce
                                    ? { duration: 0 }
                                    : {
                                          type: 'spring',
                                          stiffness: 400,
                                          damping: 18,
                                          delay: done ? index * 0.12 : 0,
                                      }
                            }
                        >
                            <FaCheck className="h-2 w-2" />
                        </motion.span>
                    </span>
                </div>

                {/* Progress bar — scaleX only */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                        className={`h-full w-full rounded-full ${ACCENT_BAR[file.accent]}`}
                        style={{ transformOrigin: 'left' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: uploading ? 1 : 0 }}
                        transition={
                            reduce
                                ? { duration: 0 }
                                : {
                                      duration: 1.6,
                                      ease: 'easeInOut',
                                      delay: uploading ? index * 0.25 : 0,
                                  }
                        }
                    />
                </div>
            </div>
        </motion.div>
    )
}

// Size text that crossfades from the pre- to post-compression value, with a
// sparkle pop on the transition — the on-device compression flair.
function SizeText({
    file,
    compressed,
    reduce,
}: {
    file: QueueFile
    compressed: boolean
    reduce: boolean
}) {
    return (
        <span className="relative inline-flex items-center gap-1">
            <span className="relative inline-grid text-right text-[11px] tabular-nums">
                <motion.span
                    className="col-start-1 row-start-1 text-gray-500 line-through"
                    initial={false}
                    animate={{ opacity: compressed ? 0 : 1 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.3 }}
                >
                    {file.sizeFrom}
                </motion.span>
                <motion.span
                    className="col-start-1 row-start-1 font-medium text-emerald-300"
                    initial={false}
                    animate={{ opacity: compressed ? 1 : 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.3 }}
                >
                    {file.sizeTo}
                </motion.span>
            </span>
            {!reduce && (
                <motion.span
                    className="text-amber-300"
                    initial={false}
                    animate={
                        compressed
                            ? { scale: [0, 1.3, 1], opacity: [0, 1, 0] }
                            : { scale: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.7 }}
                >
                    <SparkleIcon />
                </motion.span>
            )}
        </span>
    )
}

function SparkleIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
        </svg>
    )
}
