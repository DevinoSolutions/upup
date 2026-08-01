import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GRADIENT_TEXT } from '@/components/ui/SectionHeading'

// Same target as the header nav's "Live Code Editor" link (apps/landing/src/components/Navbar.tsx) —
// an anchor into the homepage's StackBlitz section (<Section id="live-editor"> in
// StackBlitzDemoSection), not a separate playground app. Internal, so it renders
// via next/link like the header does for its own internal links.
const PLAYGROUND_HREF = '/#live-editor'

export function PlaygroundCta() {
    return (
        <Link
            href={PLAYGROUND_HREF}
            data-testid="docs-playground-cta"
            className="group not-prose my-8 flex items-center justify-between gap-4 rounded-xl border border-black/5 p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-black/10 hover:shadow-sm dark:border-white/10 dark:hover:border-white/20"
        >
            <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    <span className={GRADIENT_TEXT}>Try it live</span> in the
                    playground
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Tweak every prop and see the uploader respond instantly.
                </p>
            </div>
            <ArrowRight
                className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 dark:text-gray-500"
                aria-hidden
            />
        </Link>
    )
}
