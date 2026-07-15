import Link from 'next/link'
import { ArrowRight, Github, Sparkles } from 'lucide-react'
import type { FrameworkMeta } from '@/lib/frameworks'
import FrameworkStrip from '@/components/FrameworkStrip'
import FrameworkSnippets from '@/components/FrameworkSnippets'
import HomepageFeatures from '@/components/HomepageFeatures'
import InstallCommand from '@/components/InstallCommand'
import FrameworkDemo from './FrameworkDemo'

const GITHUB_URL = 'https://github.com/DevinoSolutions/upup'

// The ONE page rendered for every /{framework} route. Everything that differs
// per framework is read from the `framework` enum entry (name, npm package,
// icon, docs link, whether the image editor shows) — so React, Vue, Svelte,
// Angular, Vanilla JS, and Preact share this exact component. Server component:
// it renders the brand <Icon/> itself and hands only serializable props
// (strings/booleans) to the client leaves (demo, snippets, strip, install).
export default function FrameworkLanding({
    framework,
}: Readonly<{ framework: FrameworkMeta }>) {
    const { id, name, Icon, brand, tagline, pkg, hasImageEditor } = framework

    return (
        <main className="w-full">
            {/* ── Hero ─────────────────────────────────────────────── */}
            <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center sm:pt-24">
                <span
                    className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-200 bg-white/70 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/60"
                    aria-hidden
                >
                    <Icon size={44} style={{ color: brand }} />
                </span>

                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
                    File uploads for{' '}
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {name}
                    </span>
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl dark:text-gray-300">
                    {tagline}
                </p>

                <div className="mt-8">
                    <InstallCommand command={`npm install ${pkg}`} />
                </div>

                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link
                        href={framework.docsQuickstart}
                        className="group inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-8 py-4 font-semibold text-white transition-all duration-200 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    >
                        Read the {name} quickstart
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/60 px-8 py-4 font-semibold text-gray-700 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800/80"
                    >
                        <Github className="h-5 w-5" />
                        View on GitHub
                    </a>
                </div>

                <div className="mt-12">
                    <FrameworkStrip
                        activeId={id}
                        heading="One core, six frameworks — pick yours"
                    />
                </div>
            </section>

            {/* ── Live demo ────────────────────────────────────────── */}
            <section className="mx-auto max-w-5xl px-4 py-12">
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                        Try it live
                    </h2>
                    <p className="mt-2 inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        {hasImageEditor ? (
                            <>
                                <Sparkles className="h-4 w-4 text-blue-500" />
                                Includes the built-in image editor
                            </>
                        ) : (
                            <>The same uploader UI your {name} users will get</>
                        )}
                    </p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white/50 p-3 backdrop-blur-sm sm:p-6 dark:border-gray-700 dark:bg-gray-900/40">
                    <FrameworkDemo imageEditor={hasImageEditor} />
                </div>
            </section>

            {/* ── Code ─────────────────────────────────────────────── */}
            <section className="mx-auto max-w-5xl px-4 py-12">
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                        Add it to your {name} app
                    </h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Install{' '}
                        <code className="font-mono">{framework.pkg}</code> and
                        drop in the component.
                    </p>
                </div>
                <FrameworkSnippets initialId={id} />
            </section>

            {/* ── Shared feature set ──────────────────────────────── */}
            <HomepageFeatures />
        </main>
    )
}
