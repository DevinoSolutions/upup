'use client'

import { useContext } from 'react'
import dynamic from 'next/dynamic'
// The uploader's stylesheet is imported per-module everywhere in landing
// (see Uploader.tsx) — without this, a docs page that mounts only the demo
// renders the uploader unstyled.
import '@useupup/react/styles'
// @useupup/react's public entry doesn't re-export UpupThemeConfig (only
// UpupThemeSlots/UpupSlotPath) — import the type from @useupup/core directly,
// same as @useupup/react's own UpupThemeProvider does internally.
import type { UpupThemeConfig } from '@useupup/core'
import { ThemeContext } from '@/lib/contexts'

// The real uploader, loaded client-only so docs pages stay static-light. The
// homepage demo proves this exact creds-free config (packages/interactive-example/
// src/preview/UploaderPreview.tsx): with serverUrl="" the whole client pipeline
// (drag-drop, previews, validation) works and nothing is persisted anywhere.
const UpupUploader = dynamic(
    () => import('@useupup/react').then(m => m.UpupUploader),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-[420px] w-full items-center justify-center rounded-xl bg-black/[0.03] text-sm text-gray-400 dark:bg-white/5 dark:text-white/40">
                Loading demo…
            </div>
        ),
    },
)

export interface DocsUploaderDemoProps {
    /** Forwarded to `<UpupUploader theme={...}>` — lets a guide page (e.g.
     * theming.mdx) embed a demo that actually reflects the theme it teaches. */
    theme?: UpupThemeConfig | undefined
    mini?: boolean | undefined
    maxFiles?: number | undefined
}

export function DocsUploaderDemo({
    theme,
    mini,
    maxFiles = 5,
}: DocsUploaderDemoProps = {}) {
    // Track the site theme so the uploader's own panel resolves dark in dark
    // mode instead of rendering a white slab inside the dark page. The default
    // mode follows the site; an explicitly-passed `theme` (e.g. the theming
    // guide's demo) COMPOSES on top and wins — its own `mode`/tokens/slots are
    // preserved, and only an unset `mode` falls back to the site's.
    const { isDarkMode } = useContext(ThemeContext)
    // Spread FIRST, then resolve `mode`: with the site mode written before the
    // spread, a caller passing an explicit `{ mode: undefined }` overwrote it
    // with undefined and the panel fell back to light on a dark page.
    const composedTheme: UpupThemeConfig = {
        ...theme,
        mode: theme?.mode ?? (isDarkMode ? 'dark' : 'light'),
    }

    return (
        <div data-testid="docs-uploader-demo" className="not-prose my-8">
            {/* Device chrome — theme-aware: a light frame (white → gray-100,
                gray-200 ring, soft shadow) in light mode, the dark navy gradient
                frame in dark mode. The uploader's own gradient panel adapts to
                the composed theme within. */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-100 p-4 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.25)] sm:p-6 dark:border-transparent dark:from-[#141b2e] dark:to-[#0a0e1a] dark:shadow-[0_24px_70px_-24px_rgba(2,6,23,0.85)] dark:ring-1 dark:ring-white/10">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300/60 to-transparent dark:via-white/30" />
                <UpupUploader
                    provider="aws"
                    serverUrl=""
                    maxFiles={maxFiles}
                    mini={mini}
                    theme={composedTheme}
                />
            </div>
            <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                Live demo — drag a file in. Demo mode: nothing leaves your
                browser.
            </p>
        </div>
    )
}
