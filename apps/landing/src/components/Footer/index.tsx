import Link from 'next/link'
import { FaGithub, FaNpm } from 'react-icons/fa'
import { FRAMEWORK_LIST } from '@/lib/frameworks'

const GITHUB_URL = 'https://github.com/DevinoSolutions/upup'

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-black/10 bg-[var(--bg-base)] dark:border-white/10">
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1">
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
                                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                            >
                                <FaGithub className="w-5 h-5" />
                            </a>
                            <a
                                href="https://www.npmjs.com/package/@upupjs/core"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="@upupjs on npm"
                                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
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
                                        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
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
                                <Link
                                    href="/documentation"
                                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                >
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/#demo"
                                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                >
                                    Live Demo
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/#features"
                                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                >
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/#faq"
                                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                >
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
                                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                >
                                    MIT License
                                </a>
                            </li>
                            <li>
                                <Link
                                    href="/privacy"
                                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-gray-200/60 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        MIT licensed. Free for commercial and personal use.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Built by{' '}
                        <a
                            href="https://devino.ca"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Devino
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    )
}
