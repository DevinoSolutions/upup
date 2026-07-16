// components/StackBlitzDemoSection.tsx
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code, ExternalLink, Maximize2, Minimize2 } from 'lucide-react'
import { FaExclamationTriangle } from 'react-icons/fa'
import { SiStackblitz } from 'react-icons/si'
import sdk, { type Project } from '@stackblitz/sdk'
import Link from 'next/link'
import Section from '@/components/ui/Section'
import SectionHeading, { GRADIENT_TEXT } from '@/components/ui/SectionHeading'

// Inline, self-owned StackBlitz project so the visible package.json pins the
// current, published packages (@upupjs/react v3 + a current Next) instead of a
// remote project we can't edit. `app/page.tsx` is the real minimal usage shown
// on every framework page. See lib/frameworks REACT_CODE.
const APP_CODE = `'use client'
import { UpupUploader } from '@upupjs/react'
import '@upupjs/react/styles'

export default function Page() {
    return (
        <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
            <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
        </main>
    )
}
`

const LAYOUT_CODE = `export const metadata = { title: 'upup — React example' }

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
`

const PACKAGE_JSON = `{
    "name": "upup-react-example",
    "private": true,
    "version": "0.1.0",
    "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start"
    },
    "dependencies": {
        "@upupjs/react": "^3.0.0",
        "next": "^15.1.6",
        "react": "^19.0.0",
        "react-dom": "^19.0.0"
    },
    "devDependencies": {
        "@types/node": "^22.10.0",
        "@types/react": "^19.0.0",
        "typescript": "^5.7.0"
    }
}
`

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig
`

const stackblitzProject: Project = {
    title: 'upup — React file uploader',
    description:
        'Minimal @upupjs/react example: drag & drop, cloud drives, and server-mode uploads.',
    template: 'node',
    files: {
        'app/page.tsx': APP_CODE,
        'app/layout.tsx': LAYOUT_CODE,
        'next.config.mjs': NEXT_CONFIG,
        'package.json': PACKAGE_JSON,
    },
}

const OPEN_FILE = 'app/page.tsx'

export default function StackBlitzDemoSection() {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [embedFailed, setEmbedFailed] = useState(false)
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false)
    const [pendingFullscreenState, setPendingFullscreenState] = useState(false)

    const openInStackBlitz = () => {
        sdk.openProject(stackblitzProject, {
            openFile: OPEN_FILE,
            newWindow: true,
        })
    }

    // lock body scroll while full screen is active
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = ''
        }
    }, [isFullscreen])

    // embed once, on mount and handle fullscreen transitions
    useEffect(() => {
        // Fallback timer for the pathological case where embedProject never
        // resolves; declared in effect scope so the cleanup below can clear it.
        let fallbackTimer: ReturnType<typeof setTimeout> | undefined

        // Add a small delay to ensure DOM is ready, especially for fullscreen container
        const timeoutId = setTimeout(
            () => {
                const targetContainer = isFullscreen
                    ? document.getElementById('fullscreen-stackblitz-container')
                    : containerRef.current

                if (!targetContainer) {
                    console.warn('StackBlitz container not found')
                    return
                }

                // Only embed if container is empty and mounted
                if (targetContainer.children.length === 0) {
                    // Start loading when embedding
                    setIsLoading(true)
                    setEmbedFailed(false)

                    try {
                        // Editor-only view: WebContainer preview needs the page
                        // to be cross-origin isolated (COOP/COEP), which we do
                        // NOT set globally because it breaks the drive OAuth
                        // popups in the live demo. So the embed shows the real
                        // (credible) source; "Open in StackBlitz" runs it live
                        // on stackblitz.com, which is isolated.
                        sdk.embedProject(targetContainer, stackblitzProject, {
                            openFile: OPEN_FILE,
                            view: 'editor',
                            theme: 'dark',
                            hideNavigation: true,
                            hideDevTools: true,
                        })
                            // Dismiss the loader when the editor is actually
                            // ready, not on a fixed timer.
                            .then(() => setIsLoading(false))
                            .catch(error => {
                                console.error('StackBlitz embed failed:', error)
                                setIsLoading(false)
                                setEmbedFailed(true)
                            })

                        // Safety net: never leave the loader up indefinitely.
                        fallbackTimer = setTimeout(
                            () => setIsLoading(false),
                            15000,
                        )
                    } catch (error) {
                        console.error('StackBlitz embed error:', error)
                        setIsLoading(false)
                        setEmbedFailed(true)
                    }
                }
            },
            isFullscreen ? 100 : 0,
        ) // Delay for fullscreen to ensure DOM is ready

        return () => {
            clearTimeout(timeoutId)
            if (fallbackTimer) clearTimeout(fallbackTimer)
        }
    }, [isFullscreen])

    const toggleFullScreen = () => {
        const newState = !isFullscreen
        setPendingFullscreenState(newState)
        setShowFullscreenWarning(true)
    }

    const confirmFullscreenChange = () => {
        setIsFullscreen(pendingFullscreenState)
        setShowFullscreenWarning(false)
    }

    const cancelFullscreenChange = () => {
        setShowFullscreenWarning(false)
        setPendingFullscreenState(isFullscreen)
    }

    return (
        <>
            <Section id="live-editor" bordered>
                {/* Header */}
                <SectionHeading
                    badge={
                        <>
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Live Code Editor
                        </>
                    }
                    title={
                        <>
                            Try it in your{' '}
                            <span className={GRADIENT_TEXT}>browser</span>
                        </>
                    }
                    subtitle="Browse a real React example — edit the component, tweak the dropzone and file picker, then open it in StackBlitz to run it live. The same uploader ships for Vue, Svelte, Angular, Vanilla JS, and Preact."
                />

                {/* Regular container when not fullscreen */}
                {!isFullscreen && (
                    <div className="surface-card-border surface-shadow relative rounded-3xl p-px">
                        <div className="surface-card-fill overflow-hidden rounded-[23px]">
                            {/* Window bar */}
                            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-6 py-4 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        app/page.tsx
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={openInStackBlitz}
                                        className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 dark:bg-primary-dark/10 dark:text-primary-dark dark:hover:bg-primary-dark/20"
                                    >
                                        <SiStackblitz className="w-4 h-4" />
                                        Open in StackBlitz
                                    </button>
                                    <button
                                        onClick={toggleFullScreen}
                                        className="inline-flex items-center gap-2 rounded-lg bg-black/5 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                        Full&nbsp;screen
                                    </button>
                                </div>
                            </div>

                            {/* StackBlitz iframe */}
                            <div className="relative">
                                {embedFailed ? (
                                    <div className="flex h-[75vh] flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center">
                                        <SiStackblitz className="h-12 w-12 text-primary-dark" />
                                        <p className="max-w-md text-sm text-gray-300">
                                            The embedded editor could not load
                                            here. Open the same example in
                                            StackBlitz to browse and run it
                                            live.
                                        </p>
                                        <button
                                            onClick={openInStackBlitz}
                                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                                        >
                                            <SiStackblitz className="w-5 h-5" />
                                            Open in StackBlitz
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        ref={containerRef}
                                        className="w-full h-[75vh] overflow-hidden"
                                    />
                                )}
                                {/* Loading overlay that covers the StackBlitz container */}
                                {isLoading && !isFullscreen && !embedFailed && (
                                    <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-10">
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                            <p className="text-white text-sm">
                                                Loading editor...
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CTA hidden while in full screen */}
                {!isFullscreen && (
                    <div className="text-center mt-12">
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Like what you see? Install the package for your
                            framework — React, Vue, Svelte, Angular, Vanilla JS,
                            or Preact — and start uploading files today.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                target="_blank"
                                href="/documentation"
                                className="group inline-flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                            >
                                <Code className="w-5 h-5" />
                                View Documentation
                                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>

                            <a
                                href="https://github.com/DevinoSolutions/upup"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] px-8 py-4 font-semibold text-gray-700 backdrop-blur-sm transition-colors hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View on GitHub
                            </a>
                        </div>
                    </div>
                )}
            </Section>

            {/* Fullscreen overlay portal */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[9999] bg-gray-900">
                    <div className="w-full h-full flex flex-col">
                        {/* Window bar with improved text readability */}
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                                </div>
                                <span className="text-sm font-medium text-white">
                                    app/page.tsx
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={openInStackBlitz}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <SiStackblitz className="w-4 h-4" />
                                    Open in StackBlitz
                                </button>
                                <button
                                    onClick={toggleFullScreen}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Minimize2 className="w-4 h-4" />
                                    Exit&nbsp;full&nbsp;screen
                                </button>
                            </div>
                        </div>

                        {/* StackBlitz iframe container */}
                        <div className="flex-1 overflow-hidden relative">
                            <div
                                className="w-full h-full"
                                id="fullscreen-stackblitz-container"
                            />
                            {/* Loading overlay for fullscreen mode */}
                            {isLoading && isFullscreen && (
                                <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                        <p className="text-white text-sm">
                                            Loading editor...
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Minimalist Warning Modal */}
            <AnimatePresence>
                {showFullscreenWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center p-4"
                        onClick={cancelFullscreenChange}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <FaExclamationTriangle className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {pendingFullscreenState
                                        ? 'Enter Fullscreen'
                                        : 'Exit Fullscreen'}
                                </h3>
                            </div>

                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                The editor will reload and any unsaved changes
                                will be lost.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={cancelFullscreenChange}
                                    className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg border border-gray-300 dark:border-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmFullscreenChange}
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
