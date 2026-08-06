import Link from 'next/link'
import { FaGithub, FaNpm } from 'react-icons/fa'
import { FRAMEWORK_LIST } from '@/lib/frameworks'

const GITHUB_URL = 'https://github.com/DevinoSolutions/upup'

/* `min-h-6` (24px) is the WCAG 2.2 Target Size (Minimum) floor — a bare
   14px footer link renders an 18px-tall hit area. inline-flex keeps the
   link box sized to its text horizontally while the min-height applies. */
const FOOTER_LINK =
    'inline-flex min-h-6 items-center text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'

const FOOTER_ICON_LINK =
    'inline-flex min-h-6 min-w-6 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-black/5 bg-[var(--bg-base)] dark:border-white/10">
            <div className="mx-auto max-w-6xl px-6 py-12">
                {/* Three link columns never divide into a 2-col track, which
                    left "Legal" alone on its own row beside an empty cell.
                    1 -> 3 -> 4 keeps every row exactly filled. */}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 md:grid-cols-4">
                    <div className="sm:col-span-3 md:col-span-1">
                        <Link
                            href="/"
                            className="text-xl font-bold text-gray-900 dark:text-white"
                        >
                            upup
                        </Link>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            One open-source file uploader for every framework.
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                            <a
                                href={GITHUB_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="upup on GitHub"
                                className={FOOTER_ICON_LINK}
                            >
                                <FaGithub className="w-5 h-5" />
                            </a>
                            <a
                                href="https://www.npmjs.com/package/@upupjs/core"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="@upupjs on npm"
                                className={FOOTER_ICON_LINK}
                            >
                                <FaNpm className="w-6 h-6" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Frameworks
                        </h3>
                        <ul className="space-y-2">
                            {FRAMEWORK_LIST.map(fw => (
                                <li key={fw.id}>
                                    <Link
                                        href={`/${fw.id}`}
                                        className={FOOTER_LINK}
                                    >
                                        {fw.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Product
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/docs/" className={FOOTER_LINK}>
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link href="/#demo" className={FOOTER_LINK}>
                                    Live Demo
                                </Link>
                            </li>
                            <li>
                                <Link href="/#features" className={FOOTER_LINK}>
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="/#faq" className={FOOTER_LINK}>
                                    FAQ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Legal
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <a
                                    href={`${GITHUB_URL}/blob/master/LICENSE`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={FOOTER_LINK}
                                >
                                    MIT License
                                </a>
                            </li>
                            <li>
                                <Link href="/privacy" className={FOOTER_LINK}>
                                    Privacy Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        MIT licensed. Free for commercial and personal use.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Built by{' '}
                        <a
                            href="https://devino.ca"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-6 items-center transition-colors hover:text-gray-900 dark:hover:text-white"
                        >
                            Devino
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    )
}
