'use client'

import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
    FaUpload,
    FaGlobe,
    FaShieldAlt,
    FaEdit,
    FaHistory,
    FaMicrochip,
    FaBolt,
    FaCloud,
    FaEye,
    FaPalette,
    FaUniversalAccess,
    FaArrowRight,
} from 'react-icons/fa'
import {
    FrameworksVignette,
    SourcesVignette,
    ServerModeVignette,
    EditorVignette,
    ResumeVignette,
    PipelineVignette,
} from './vignettes'

const easeCurve: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

interface HeroRow {
    icon: React.ReactNode
    title: string
    description: string
    Vignette: React.ComponentType
    live: boolean
}

// The six hero rows. Copy is tightened from the previous feature cards; the
// image-editor row keeps the React & Preact qualifier, and the accessibility
// line stays "accessibility checks in our CI suite" (no invented claims).
const heroRows: HeroRow[] = [
    {
        icon: <FaUpload className="h-6 w-6" />,
        title: 'Six Frameworks, One Uploader',
        description:
            'Native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact — one uploader that renders byte-identical DOM in every framework, enforced by a cross-framework parity suite.',
        Vignette: FrameworksVignette,
        live: true,
    },
    {
        icon: <FaGlobe className="h-6 w-6" />,
        title: 'Cloud Drives, Camera & Screen Capture',
        description:
            'Import files straight from Google Drive, OneDrive, Dropbox, and Box — plus device camera, screen capture, audio recording, and link (URL) imports.',
        Vignette: SourcesVignette,
        live: true,
    },
    {
        icon: <FaShieldAlt className="h-6 w-6" />,
        title: 'Secure Server Mode',
        description:
            'Optional server mode proxies uploads through your own backend with an HMAC-signed trust model, keeping storage credentials off the client — with ready-made adapters for Express, Fastify, Hono, and Next.js.',
        Vignette: ServerModeVignette,
        live: false,
    },
    {
        icon: <FaEdit className="h-6 w-6" />,
        title: 'Built-In Image Editor (React & Preact)',
        description:
            'Crop, rotate, annotate, and filter images before upload with the integrated Filerobot editor — available in React and Preact, loaded lazily so it never weighs down your bundle.',
        Vignette: EditorVignette,
        live: true,
    },
    {
        icon: <FaHistory className="h-6 w-6" />,
        title: 'Crash-Safe & Resumable',
        description:
            'Reload the page mid-upload and pick up where you left off — crash recovery restores the queue, and resumable chunked uploads (tus) handle large files over unreliable networks.',
        Vignette: ResumeVignette,
        live: false,
    },
    {
        icon: <FaMicrochip className="h-6 w-6" />,
        title: 'Fast by Default: Workers + HEIC',
        description:
            'Image compression runs off the main thread in a web worker, so the page stays responsive — and opt-in HEIC to JPEG conversion means .heic photos from iPhones just work.',
        Vignette: PipelineVignette,
        live: false,
    },
]

// The remaining five features as a compact secondary chip strip (no vignettes).
const secondaryFeatures = [
    {
        icon: <FaBolt className="h-5 w-5" />,
        title: 'Headless Core',
        description: 'Framework-agnostic engine — bring your own UI.',
    },
    {
        icon: <FaCloud className="h-5 w-5" />,
        title: 'Any S3-Compatible Storage',
        description: 'AWS, R2, MinIO, Spaces, B2, Wasabi, and more.',
    },
    {
        icon: <FaEye className="h-5 w-5" />,
        title: 'Previews, Progress & Retry',
        description: 'Live previews, progress bar, and automatic retry.',
    },
    {
        icon: <FaPalette className="h-5 w-5" />,
        title: 'Themeable & Localized',
        description: 'Theme tokens, dark mode, and built-in locales.',
    },
    {
        icon: <FaUniversalAccess className="h-5 w-5" />,
        title: 'Accessible & TypeScript-First',
        description: 'Accessibility checks in our CI suite, fully typed APIs.',
    },
]

function FeatureRow({ row, index }: { row: HeroRow; index: number }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, amount: 0.3 })
    const flipped = index % 2 === 1
    const { Vignette } = row

    return (
        <div
            ref={ref}
            className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12"
        >
            {/* Text column */}
            <motion.div
                className={`order-2 ${flipped ? 'lg:order-2' : 'lg:order-1'}`}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, ease: easeCurve }}
            >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark">
                    {row.icon}
                </div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    {row.title}
                </h3>
                <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                    {row.description}
                </p>
                {row.live && (
                    <a
                        href="#demo"
                        className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:text-primary-dark dark:hover:text-primary"
                    >
                        See it live
                        <FaArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </a>
                )}
            </motion.div>

            {/* Visual column */}
            <motion.div
                className={`order-1 flex min-h-[260px] items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-white p-8 shadow-md dark:border-white/10 dark:bg-white/5 ${
                    flipped ? 'lg:order-1' : 'lg:order-2'
                }`}
                initial={{ opacity: 0, x: flipped ? -40 : 40 }}
                animate={
                    inView
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: flipped ? -40 : 40 }
                }
                transition={{ duration: 0.7, ease: easeCurve }}
            >
                <Vignette />
            </motion.div>
        </div>
    )
}

export default function FeatureShowcase() {
    const stripRef = useRef(null)
    const stripInView = useInView(stripRef, { once: true, amount: 0.2 })

    return (
        <div className="mb-16">
            {/* Alternating hero rows */}
            <div className="flex flex-col gap-16 sm:gap-20 lg:gap-24">
                {heroRows.map((row, index) => (
                    <FeatureRow key={row.title} row={row} index={index} />
                ))}
            </div>

            {/* Secondary feature strip */}
            <motion.div
                ref={stripRef}
                className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
                initial="hidden"
                animate={stripInView ? 'visible' : 'hidden'}
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.08 },
                    },
                }}
            >
                {secondaryFeatures.map(feature => (
                    <motion.div
                        key={feature.title}
                        className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: {
                                opacity: 1,
                                y: 0,
                                transition: { duration: 0.5, ease: easeCurve },
                            },
                        }}
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark">
                            {feature.icon}
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {feature.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            {feature.description}
                        </p>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    )
}
