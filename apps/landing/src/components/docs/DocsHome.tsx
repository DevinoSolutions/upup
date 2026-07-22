'use client'

import type { IconType } from 'react-icons'
import Link from 'next/link'
import { SiNextdotjs } from 'react-icons/si'
import {
    ArrowRight,
    ArrowRightLeft,
    BookOpen,
    Code2,
    Compass,
    KeyRound,
    Languages,
    RefreshCw,
    Scale,
    ShieldAlert,
    Sparkles,
    type LucideIcon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { GRADIENT_TEXT, H3_HEADING } from '@/components/ui/SectionHeading'
import { ICON_CHIP } from '@/components/ui/recipes'
import { FRAMEWORKS } from '@/lib/frameworks'
import { DocsUploaderDemo } from './DocsUploaderDemo'

// Quickstart links. The slug is the docs route segment (/docs/quickstarts/<slug>/)
// and is declared independently of FRAMEWORKS ids — the six shared icons/brands
// are still sourced from the one framework registry, and Next.js (docs-only, no
// UI package) is appended locally.
const FRAMEWORK_LINKS: {
    slug: string
    name: string
    Icon: IconType
    brand?: string
}[] = [
    {
        slug: 'react',
        name: 'React',
        Icon: FRAMEWORKS.react.Icon,
        brand: FRAMEWORKS.react.brand,
    },
    {
        slug: 'vue',
        name: 'Vue',
        Icon: FRAMEWORKS.vue.Icon,
        brand: FRAMEWORKS.vue.brand,
    },
    {
        slug: 'svelte',
        name: 'Svelte',
        Icon: FRAMEWORKS.svelte.Icon,
        brand: FRAMEWORKS.svelte.brand,
    },
    {
        slug: 'angular',
        name: 'Angular',
        Icon: FRAMEWORKS.angular.Icon,
        brand: FRAMEWORKS.angular.brand,
    },
    {
        slug: 'vanilla',
        name: 'Vanilla JS',
        Icon: FRAMEWORKS.vanilla.Icon,
        brand: FRAMEWORKS.vanilla.brand,
    },
    {
        slug: 'preact',
        name: 'Preact',
        Icon: FRAMEWORKS.preact.Icon,
        brand: FRAMEWORKS.preact.brand,
    },
    { slug: 'next', name: 'Next.js', Icon: SiNextdotjs },
]

const SECTION_CARDS: {
    title: string
    Icon: LucideIcon
    href: string
    desc: string
}[] = [
    {
        title: 'Getting started',
        Icon: BookOpen,
        href: '/docs/getting-started/',
        desc: 'Install upup and run your first upload.',
    },
    {
        title: 'Guides',
        Icon: Compass,
        href: '/docs/guides/modes/',
        desc: 'Client vs server mode, storage, theming, headless.',
    },
    {
        title: 'Code examples',
        Icon: Code2,
        href: '/docs/code-examples/',
        desc: 'Copy-paste recipes for common setups.',
    },
    {
        title: 'Error handling',
        Icon: ShieldAlert,
        href: '/docs/error-handling/',
        desc: 'Catch, display, and recover from upload errors.',
    },
    {
        title: 'Resumable uploads',
        Icon: RefreshCw,
        href: '/docs/resumable-uploads/',
        desc: 'Large files over flaky networks with tus.',
    },
    {
        title: 'Localization',
        Icon: Languages,
        href: '/docs/localization/',
        desc: "Ship the uploader in your users' language.",
    },
    {
        title: 'Credentials',
        Icon: KeyRound,
        href: '/docs/credentials-configuration/',
        desc: 'Wire up S3-compatible storage credentials.',
    },
    {
        title: 'AI assistants',
        Icon: Sparkles,
        href: '/docs/ai-assistants/',
        desc: 'llms.txt and machine-readable docs.',
    },
    {
        title: 'Comparisons',
        Icon: Scale,
        href: '/docs/comparisons/upup-vs-uppy/',
        desc: 'How upup stacks up against alternatives.',
    },
    {
        title: 'Migration',
        Icon: ArrowRightLeft,
        href: '/docs/migration/v1-to-v3/',
        desc: 'Move from v1 to v3.',
    },
]

export function DocsHome() {
    const reduce = useReducedMotion()

    // Hero: the two columns fade+rise on mount with a small stagger. Reduced
    // motion renders the final state with no movement (initial={false}).
    const heroContainer = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
    }
    const column = {
        hidden: { opacity: 0, y: 16 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: 'easeOut' as const },
        },
    }
    const card = {
        hidden: { opacity: 0, y: 12 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                delay: i * 0.04,
                ease: 'easeOut' as const,
            },
        }),
    }

    return (
        <div>
            {/* HERO */}
            <motion.div
                className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12"
                variants={heroContainer}
                initial={reduce ? false : 'hidden'}
                animate="visible"
            >
                <motion.div variants={column}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        Documentation
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                        Everything you need to{' '}
                        <span className={GRADIENT_TEXT}>ship uploads</span>
                    </h1>
                    <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
                        A file uploader with a native UI for React, Vue, Svelte,
                        Angular, Vanilla JS, and Preact, built on a shared
                        headless core with an optional server mode.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/docs/getting-started/"
                            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-8 py-4 font-semibold text-white transition-all duration-200 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                        >
                            Get started
                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            href="/docs/api-reference/upupuploader/required-props/"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white px-8 py-4 font-semibold text-gray-700 transition-colors duration-200 hover:border-black/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-gray-300 dark:hover:border-white/20"
                        >
                            API reference
                        </Link>
                    </div>
                </motion.div>
                <motion.div variants={column}>
                    <DocsUploaderDemo />
                </motion.div>
            </motion.div>

            {/* FRAMEWORK GRID */}
            <div data-testid="docs-framework-grid" className="mt-16">
                <h2 className={H3_HEADING}>Pick your framework</h2>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {FRAMEWORK_LINKS.map(fw => (
                        <Link
                            key={fw.slug}
                            href={`/docs/quickstarts/${fw.slug}/`}
                            className="flex items-center gap-2 rounded-lg border border-black/5 px-3 py-2.5 text-sm transition-colors hover:border-black/10 dark:border-white/10 dark:hover:border-white/20"
                        >
                            <fw.Icon
                                size={18}
                                aria-hidden
                                style={
                                    fw.brand ? { color: fw.brand } : undefined
                                }
                            />
                            <span>{fw.name}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* SECTION CARDS */}
            <div data-testid="docs-section-cards" className="mt-16">
                <h2 className={H3_HEADING}>Browse the docs</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {SECTION_CARDS.map((c, i) => (
                        <motion.div
                            key={c.href}
                            variants={card}
                            custom={i}
                            initial={reduce ? false : 'hidden'}
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            <Link
                                href={c.href}
                                className="flex h-full flex-col rounded-xl border border-black/5 p-5 transition-colors hover:border-black/10 dark:border-white/10 dark:hover:border-white/20"
                            >
                                <span
                                    className={`${ICON_CHIP} h-10 w-10 rounded-lg`}
                                >
                                    <c.Icon className="h-5 w-5" />
                                </span>
                                <span className="mt-4 font-medium text-gray-900 dark:text-white">
                                    {c.title}
                                </span>
                                <span className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {c.desc}
                                </span>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
