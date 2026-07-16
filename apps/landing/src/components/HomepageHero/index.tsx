'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
    Copy,
    Check,
    Play,
    Github,
    ExternalLink,
    ArrowRight,
    ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import GradientText from '@/components/TextAnimation/GradientText'
import BlurText from '@/components/TextAnimation/BlurText'
import FrameworkSnippets from '@/components/FrameworkSnippets'
import FrameworkStrip from '@/components/FrameworkStrip'
import { HeroSession } from '@/components/UploaderScene'
import { FRAMEWORKS, type FrameworkId } from '@/lib/frameworks'

export default function HeroSection({
    framework,
}: Readonly<{ framework?: FrameworkId }> = {}) {
    const fw = framework ? FRAMEWORKS[framework] : undefined
    const [copied, setCopied] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedManager, setSelectedManager] = useState('npm')

    // Non-`once` observer on the hero visual: the scene only runs while it is
    // on-screen (the FeatureShowcase idiom). usePanelCursor stays internal to
    // HeroSession — we just pass the gate down.
    const visualRef = useRef(null)
    const visualActive = useInView(visualRef, { amount: 0.2 })

    const pkg = fw?.pkg ?? '@upupjs/react'
    const packageManagers = useMemo(
        () => [
            { id: 'npm', name: 'npm', command: `npm install ${pkg}` },
            { id: 'pnpm', name: 'pnpm', command: `pnpm add ${pkg}` },
            { id: 'yarn', name: 'Yarn', command: `yarn add ${pkg}` },
            { id: 'bun', name: 'Bun', command: `bun add ${pkg}` },
        ],
        [pkg],
    )

    const currentCommand = useMemo(() => {
        return (
            packageManagers.find(pm => pm.id === selectedManager)?.command ||
            packageManagers[0].command
        )
    }, [selectedManager, packageManagers])

    const handleSelectManager = useCallback(
        (managerId: string) => {
            setSelectedManager(managerId)
            setIsOpen(false)

            // Auto-copy when selection changes
            const command = packageManagers.find(
                pm => pm.id === managerId,
            )?.command
            if (
                command &&
                typeof window !== 'undefined' &&
                navigator.clipboard
            ) {
                navigator.clipboard
                    .writeText(command)
                    .then(() => {
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                    })
                    .catch(() => console.warn('Please copy text manually!'))
            }
        },
        [packageManagers],
    )

    const handleCopy = useCallback(() => {
        if (typeof window !== 'undefined' && navigator.clipboard) {
            navigator.clipboard
                .writeText(currentCommand)
                .then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                })
                .catch(() => console.warn('Please copy text manually!'))
        }
    }, [currentCommand])

    const easeCurve: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

    // Animation variants — y/opacity/scale only (no x-slides; the section is
    // overflow-hidden and clips horizontal entrances at narrow viewports).
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2,
            },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.7,
                ease: easeCurve,
            },
        },
    }

    const badgeVariants = {
        hidden: { opacity: 0, y: -20, scale: 0.8 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: easeCurve,
            },
        },
    }

    const headingVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                ease: easeCurve,
                delay: 0.2,
            },
        },
    }

    const subtitleVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.7,
                ease: easeCurve,
                delay: 0.4,
            },
        },
    }

    const buttonVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: easeCurve,
            },
        },
    }

    const installBoxVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.9 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.7,
                ease: easeCurve,
                delay: 0.8,
            },
        },
    }

    const visualVariants = {
        hidden: { opacity: 0, y: 40, scale: 0.96 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.9,
                ease: easeCurve,
                delay: 0.3,
            },
        },
    }

    return (
        <section className="relative mt-28 overflow-hidden px-6 pt-12 pb-16">
            <div className="relative mx-auto max-w-6xl">
                {/* Two-column split ≥lg: copy + CTAs + install left, the live
                    uploader animation right. Stacks on mobile with the animation
                    right under the fold copy. */}
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                    {/* LEFT — copy, CTAs, install box */}
                    <motion.div
                        className="flex flex-col items-center text-center lg:items-start lg:text-left"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Badge — hairline pill (the one border recipe). */}
                        <motion.div
                            className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-black/5 px-4 py-2 text-sm font-medium text-gray-600 dark:border-white/10 dark:text-gray-300"
                            variants={badgeVariants}
                        >
                            <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                            <span>Open source · One core, six frameworks</span>
                        </motion.div>

                        {/* Main Heading */}
                        <motion.h1
                            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
                            variants={headingVariants}
                        >
                            <BlurText
                                text="One File Uploader,"
                                delay={150}
                                animateBy="words"
                                direction="top"
                                className="text-gray-900 dark:text-white justify-center lg:justify-start"
                            />

                            <span className="relative">
                                <GradientText
                                    colors={[
                                        '#1849d6',
                                        '#4079ff',
                                        '#37c4f5',
                                        '#4079ff',
                                        '#1849d6',
                                    ]}
                                    animationSpeed={10}
                                    showBorder={false}
                                    className="font-bold"
                                >
                                    {fw?.name ?? 'Every Framework'}
                                </GradientText>
                            </span>
                        </motion.h1>

                        {/* Subtitle — tightened; every claim carries over verbatim
                            (drag-and-drop, headless core, native UI, cloud drives,
                            camera, screen capture, secure S3 server-mode). */}
                        <motion.p
                            className="text-base sm:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-xl"
                            variants={subtitleVariants}
                        >
                            A drag-and-drop file uploader with a headless core
                            and native UI for{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {fw?.name ??
                                    'React, Vue, Svelte, Angular, Vanilla JS & Preact'}
                            </span>
                            . Cloud drives, camera, screen capture, and secure
                            server-mode uploads to any S3-compatible storage.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-8"
                            variants={itemVariants}
                            transition={{ delay: 0.6 }}
                        >
                            <motion.div
                                variants={buttonVariants}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Link
                                    href="#demo"
                                    className="group inline-flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                                >
                                    <Play className="w-5 h-5" />
                                    Try Live Demo
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </motion.div>

                            <motion.div
                                variants={buttonVariants}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ delay: 0.1 }}
                            >
                                <a
                                    href="https://github.com/DevinoSolutions/upup"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-white/[0.05] border border-black/5 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold hover:border-black/10 dark:hover:border-white/20 transition-colors duration-200"
                                >
                                    <Github className="w-5 h-5" />
                                    View Source
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </motion.div>
                        </motion.div>

                        {/* Install Command with Package Manager Select — the page's
                            ONE install surface. Behaviour is unchanged. */}
                        <motion.div
                            className="w-full max-w-lg mx-auto lg:mx-0"
                            variants={installBoxVariants}
                        >
                            {/* Flat hairline surface — the page's ONE install
                                surface. No overflow-hidden so the absolute z-50
                                package-manager menu below is never clipped. */}
                            <div className="rounded-2xl border border-black/5 bg-[var(--bg-base)] dark:border-white/10">
                                <div className="relative rounded-2xl p-4">
                                    <div className="flex items-center justify-between">
                                        <motion.code
                                            className="text-sm font-mono text-gray-700 dark:text-gray-300 select-all flex-1 mr-4 truncate"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{
                                                delay: 1,
                                                duration: 0.5,
                                            }}
                                        >
                                            {currentCommand}
                                        </motion.code>

                                        <motion.div
                                            className="flex items-center gap-2"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{
                                                delay: 1.1,
                                                duration: 0.5,
                                            }}
                                        >
                                            {/* Copy Button */}
                                            <motion.button
                                                onClick={handleCopy}
                                                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <AnimatePresence mode="wait">
                                                    {copied ? (
                                                        <motion.div
                                                            key="check"
                                                            initial={{
                                                                scale: 0,
                                                                rotate: -180,
                                                            }}
                                                            animate={{
                                                                scale: 1,
                                                                rotate: 0,
                                                            }}
                                                            exit={{
                                                                scale: 0,
                                                                rotate: 180,
                                                            }}
                                                            transition={{
                                                                duration: 0.3,
                                                            }}
                                                        >
                                                            <Check className="w-4 h-4 text-green-600" />
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="copy"
                                                            initial={{
                                                                scale: 0,
                                                                rotate: -180,
                                                            }}
                                                            animate={{
                                                                scale: 1,
                                                                rotate: 0,
                                                            }}
                                                            exit={{
                                                                scale: 0,
                                                                rotate: 180,
                                                            }}
                                                            transition={{
                                                                duration: 0.3,
                                                            }}
                                                        >
                                                            <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.button>

                                            {/* Package Manager Select */}
                                            <div className="relative">
                                                <motion.button
                                                    onClick={() =>
                                                        setIsOpen(!isOpen)
                                                    }
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px]"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <span>
                                                        {
                                                            packageManagers.find(
                                                                pm =>
                                                                    pm.id ===
                                                                    selectedManager,
                                                            )?.name
                                                        }
                                                    </span>
                                                    <motion.div
                                                        animate={{
                                                            rotate: isOpen
                                                                ? 180
                                                                : 0,
                                                        }}
                                                        transition={{
                                                            duration: 0.3,
                                                            ease: easeCurve,
                                                        }}
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </motion.div>
                                                </motion.button>

                                                <AnimatePresence>
                                                    {isOpen && (
                                                        <motion.div
                                                            initial={{
                                                                opacity: 0,
                                                                y: -10,
                                                                scale: 0.95,
                                                            }}
                                                            animate={{
                                                                opacity: 1,
                                                                y: 0,
                                                                scale: 1,
                                                            }}
                                                            exit={{
                                                                opacity: 0,
                                                                y: -10,
                                                                scale: 0.95,
                                                            }}
                                                            transition={{
                                                                duration: 0.2,
                                                            }}
                                                            className="absolute z-50 top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]"
                                                        >
                                                            {packageManagers.map(
                                                                (
                                                                    manager,
                                                                    index,
                                                                ) => (
                                                                    <motion.button
                                                                        key={
                                                                            manager.id
                                                                        }
                                                                        onClick={() =>
                                                                            handleSelectManager(
                                                                                manager.id,
                                                                            )
                                                                        }
                                                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                                                            selectedManager ===
                                                                            manager.id
                                                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                                                                                : 'text-gray-700 dark:text-gray-300'
                                                                        }`}
                                                                        initial={{
                                                                            opacity: 0,
                                                                            x: -10,
                                                                        }}
                                                                        animate={{
                                                                            opacity: 1,
                                                                            x: 0,
                                                                        }}
                                                                        transition={{
                                                                            delay:
                                                                                index *
                                                                                0.05,
                                                                        }}
                                                                        whileHover={{
                                                                            backgroundColor:
                                                                                'rgba(0, 0, 0, 0.05)',
                                                                            x: 4,
                                                                        }}
                                                                        whileTap={{
                                                                            scale: 0.98,
                                                                        }}
                                                                    >
                                                                        {
                                                                            manager.name
                                                                        }
                                                                    </motion.button>
                                                                ),
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* RIGHT — the live-usage animation as the hero's visual
                        anchor. Decorative, so it carries no copy; the left
                        column holds all the info. */}
                    <motion.div
                        ref={visualRef}
                        className="relative"
                        variants={visualVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <HeroSession active={visualActive} />
                    </motion.div>
                </div>

                {/* Full-width below the grid: framework strip, then the
                    same-API-everywhere snippets. */}
                <FrameworkStrip
                    activeId={fw?.id}
                    heading="Works with every framework — pick yours"
                    className="mt-16"
                />

                <div className="mt-12">
                    <FrameworkSnippets initialId={fw?.id} />
                </div>
            </div>
        </section>
    )
}
