import type { Metadata } from 'next'
import Link from 'next/link'
import Section from '@/components/ui/Section'

// The page a cloud-drive sign-in popup lands on (OneDrive, Dropbox, Box). The
// homepage demo watches the popup, reads the provider's code from this URL and
// closes the window, usually before this page has painted. Before these routes
// existed the popup flashed the site's 404 instead. Never indexed: the URL is
// only ever reached with a one-time code, and there is nothing to find here.
export function oauthRedirectMetadata(provider: string): Metadata {
    return {
        title: `Finishing ${provider} sign-in — upup`,
        description: `Completing the ${provider} sign-in for the upup uploader. This window closes on its own.`,
        robots: { index: false, follow: false },
    }
}

const LINK_CLASS =
    'inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/[0.05]'

export default function OAuthRedirectPage({ provider }: { provider: string }) {
    return (
        <Section className="flex min-h-[60vh] items-center">
            <div
                className="mx-auto max-w-xl text-center"
                data-testid="oauth-redirect"
            >
                <h1 className="text-xl font-medium text-gray-900 dark:text-white">
                    Finishing {provider} sign-in…
                </h1>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    This window closes on its own once the uploader has picked
                    up the sign-in. If it stays open, close it and try again
                    from the page you started on.
                </p>
                <div className="mt-8 flex justify-center">
                    <Link href="/" className={LINK_CLASS}>
                        Back to home
                    </Link>
                </div>
            </div>
        </Section>
    )
}
