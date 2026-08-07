import type { Metadata } from 'next'
import Link from 'next/link'
import { Github } from 'lucide-react'
import Section from '@/components/ui/Section'

// The site's 404. Before this file existed, Next served its built-in default —
// a bare centred "404 | This page could not be found." that inherited the root
// layout's DEFAULT metadata, so a missing page advertised itself in the tab as
// the normal marketing title. Deliberately NOT canonicalised and marked
// noindex: a 404 is not a page anyone should be pointed at from search.
//
// No search widget here on purpose — the docs search is a heavy client island
// scoped to /docs, and the three links below cover where a lost visitor is
// actually trying to go.
export const metadata: Metadata = {
    title: 'Page not found — upup',
    description:
        'That page does not exist. Head back to the homepage or browse the upup documentation.',
    robots: { index: false, follow: true },
}

const LINK_CLASS =
    'inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/[0.05]'

export default function NotFound() {
    return (
        <Section className="flex min-h-[60vh] items-center">
            <div className="mx-auto max-w-xl text-center">
                <p className="text-6xl font-semibold tracking-tight text-gray-900 sm:text-7xl dark:text-white">
                    404
                </p>
                <h1 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">
                    That page does not exist
                </h1>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    The link may be out of date, or the page may have moved.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link href="/" className={LINK_CLASS}>
                        Back to home
                    </Link>
                    <Link href="/docs/" className={LINK_CLASS}>
                        Documentation
                    </Link>
                    <a
                        href="https://github.com/DevinoSolutions/upup"
                        target="_blank"
                        rel="noreferrer"
                        className={LINK_CLASS}
                    >
                        <Github className="h-4 w-4" />
                        GitHub
                    </a>
                </div>
            </div>
        </Section>
    )
}
