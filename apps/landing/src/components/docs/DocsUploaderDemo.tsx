'use client'

import dynamic from 'next/dynamic'
// The uploader's stylesheet is imported per-module everywhere in landing
// (see Uploader.tsx) — without this, a docs page that mounts only the demo
// renders the uploader unstyled.
import '@upupjs/react/styles'
// @upupjs/react's public entry doesn't re-export UpupThemeConfig (only
// UpupThemeSlots/UpupSlotPath) — import the type from @upupjs/core directly,
// same as @upupjs/react's own UpupThemeProvider does internally.
import type { UpupThemeConfig } from '@upupjs/core'

// The real uploader, loaded client-only so docs pages stay static-light. The
// homepage demo proves this exact creds-free config (packages/interactive-example/
// src/preview/UploaderPreview.tsx): with serverUrl="" the whole client pipeline
// (drag-drop, previews, validation) works and nothing is persisted anywhere.
const UpupUploader = dynamic(
    () => import('@upupjs/react').then(m => m.UpupUploader),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-[420px] w-full items-center justify-center rounded-xl bg-white/5 text-sm text-white/40">
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
    return (
        <div data-testid="docs-uploader-demo" className="not-prose my-8">
            {/* Dark gradient device chrome — the MockUploader recipe, kept
                deliberately dark in both site themes. */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141b2e] to-[#0a0e1a] p-4 shadow-[0_24px_70px_-24px_rgba(2,6,23,0.85)] ring-1 ring-white/10 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <UpupUploader
                    provider="aws"
                    serverUrl=""
                    maxFiles={maxFiles}
                    mini={mini}
                    theme={theme}
                />
            </div>
            <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                Live demo — drag a file in. Demo mode: nothing leaves your
                browser.
            </p>
        </div>
    )
}
