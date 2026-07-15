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
import Card, { ACCENT_HUES, type AccentHue } from '@/components/ui/Card'
import { H3_HEADING } from '@/components/ui/SectionHeading'
import {
    FrameworksScene,
    DriveScene,
    EditorScene,
    ResumeScene,
    PipelineScene,
} from '@/components/UploaderScene'
import { ServerModeVignette } from './vignettes'

const easeCurve: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

interface HeroRow {
    icon: React.ReactNode
    title: string
    description: string
    accent: AccentHue
    Visual: React.ComponentType<{ active?: boolean }>
    live: boolean
}

// The six hero rows. Copy is unchanged from the prior showcase; the image-editor
// row keeps the React & Preact qualifier and the accessibility line stays
// "accessibility checks in our CI suite" (no invented claims). Each visual is now
// a scene segment reused from the hero movie (except Server Mode, which keeps its
// diagram), and each row carries its own accent hue instead of 12 identical blues.
const heroRows: HeroRow[] = [
    {
        icon: <FaUpload className="h-6 w-6" />,
        title: 'Six Frameworks, One Uploader',
        description:
            'Native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact — one uploader that renders byte-identical DOM in every framework, enforced by a cross-framework parity suite.',
        accent: 'blue',
        Visual: FrameworksScene,
        live: true,
    },
    {
        icon: <FaGlobe className="h-6 w-6" />,
        title: 'Cloud Drives, Camera & Screen Capture',
        description:
            'Import files straight from Google Drive, OneDrive, Dropbox, and Box — plus device camera, screen capture, audio recording, and link (URL) imports.',
        accent: 'teal',
        Visual: DriveScene,
        live: true,
    },
    {
        icon: <FaShieldAlt className="h-6 w-6" />,
        title: 'Secure Server Mode',
        description:
            'Optional server mode proxies uploads through your own backend with an HMAC-signed trust model, keeping storage credentials off the client — with ready-made adapters for Express, Fastify, Hono, and Next.js.',
        accent: 'green',
        Visual: ServerModeVignette,
        live: false,
    },
    {
        icon: <FaEdit className="h-6 w-6" />,
        title: 'Built-In Image Editor (React & Preact)',
        description:
            'Crop, rotate, annotate, and filter images before upload with the integrated Filerobot editor — available in React and Preact, loaded lazily so it never weighs down your bundle.',
        accent: 'violet',
        Visual: EditorScene,
        live: true,
    },
    {
        icon: <FaHistory className="h-6 w-6" />,
        title: 'Crash-Safe & Resumable',
        description:
            'Reload the page mid-upload and pick up where you left off — crash recovery restores the queue, and resumable chunked uploads (tus) handle large files over unreliable networks.',
        accent: 'amber',
        Visual: ResumeScene,
        live: false,
    },
    {
        icon: <FaMicrochip className="h-6 w-6" />,
        title: 'Fast by Default: Workers + HEIC',
        description:
            'Image compression runs off the main thread in a web worker, so the page stays responsive — and opt-in HEIC to JPEG conversion means .heic photos from iPhones just work.',
        accent: 'pink',
        Visual: PipelineScene,
        live: false,
    },
]

// The remaining five features as a compact secondary chip strip (no scenes),
// each with its own accent hue.
const secondaryFeatures: {
    icon: React.ReactNode
    title: string
    description: string
    accent: AccentHue
}[] = [
    {
        icon: <FaBolt className="h-5 w-5" />,
        title: 'Headless Core',
        description: 'Framework-agnostic engine — bring your own UI.',
        accent: 'blue',
    },
    {
        icon: <FaCloud className="h-5 w-5" />,
        title: 'Any S3-Compatible Storage',
        description: 'AWS, R2, MinIO, Spaces, B2, Wasabi, and more.',
        accent: 'teal',
    },
    {
        icon: <FaEye className="h-5 w-5" />,
        title: 'Previews, Progress & Retry',
        description: 'Live previews, progress bar, and automatic retry.',
        accent: 'violet',
    },
    {
        icon: <FaPalette className="h-5 w-5" />,
        title: 'Themeable & Localized',
        description: 'Theme tokens, dark mode, and built-in locales.',
        accent: 'amber',
    },
    {
        icon: <FaUniversalAccess className="h-5 w-5" />,
        title: 'Accessible & TypeScript-First',
        description: 'Accessibility checks in our CI suite, fully typed APIs.',
        accent: 'green',
    },
]

function FeatureRow({ row, index }: { row: HeroRow; index: number }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, amount: 0.3 })
    // Separate, non-`once` observer so scenes only animate while on-screen.
    const active = useInView(ref, { amount: 0.2 })
    const flipped = index % 2 === 1
    const { Visual } = row
    const hue = ACCENT_HUES[row.accent]

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
                <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${hue.icon}`}
                >
                    {row.icon}
                </div>
                <h3 className={`mb-4 ${H3_HEADING}`}>{row.title}</h3>
                <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                    {row.description}
                </p>
                {row.live && (
                    <a
                        href="#demo"
                        aria-label={`See ${row.title} live`}
                        className={`group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${hue.text}`}
                    >
                        See it live
                        <FaArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </a>
                )}
            </motion.div>

            {/* Visual column — decorative, hidden from assistive tech */}
            <motion.div
                aria-hidden="true"
                className={`order-1 ${flipped ? 'lg:order-1' : 'lg:order-2'}`}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.7, ease: easeCurve }}
            >
                <Card
                    hover
                    accent={row.accent}
                    className="flex min-h-[320px] items-center justify-center p-5 sm:p-6"
                >
                    <Visual active={active} />
                </Card>
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
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: {
                                opacity: 1,
                                y: 0,
                                transition: { duration: 0.5, ease: easeCurve },
                            },
                        }}
                    >
                        <Card
                            hover
                            accent={feature.accent}
                            className="flex flex-col gap-2 p-5"
                        >
                            <div
                                className={`flex h-9 w-9 items-center justify-center rounded-xl ${ACCENT_HUES[feature.accent].icon}`}
                            >
                                {feature.icon}
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {feature.title}
                            </h4>
                            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                {feature.description}
                            </p>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    )
}
