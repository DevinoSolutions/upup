import Link from 'next/link'
import type { MDXComponents } from 'mdx/types'
import type { ComponentProps, ReactNode } from 'react'

import { CodeBlock } from './CodeBlock'
import { DocsUploaderDemo } from './DocsUploaderDemo'
import { FrameworkTabs } from './FrameworkTabs'
import { DriveOAuthDiagram } from './diagrams/DriveOAuthDiagram'
import { ModesDiagram } from './diagrams/ModesDiagram'
import { PipelineDiagram } from './diagrams/PipelineDiagram'
import { TrustModelDiagram } from './diagrams/TrustModelDiagram'
import { PlaygroundCta } from './PlaygroundCta'

const CALLOUT_STYLES: Record<string, string> = {
    note: 'border-sky-500/40 bg-sky-500/5',
    tip: 'border-emerald-500/40 bg-emerald-500/5',
    info: 'border-sky-500/40 bg-sky-500/5',
    warning: 'border-amber-500/40 bg-amber-500/5',
    danger: 'border-red-500/40 bg-red-500/5',
}

export function Callout({
    type = 'note',
    title,
    children,
}: {
    type?: keyof typeof CALLOUT_STYLES
    title?: string
    children: ReactNode
}) {
    return (
        <div
            className={`my-4 rounded-md border px-4 py-3 text-sm ${CALLOUT_STYLES[type] ?? CALLOUT_STYLES.note}`}
        >
            {title ? <p className="mb-1 font-semibold">{title}</p> : null}
            {children}
        </div>
    )
}

const EXTERNAL_HREF = /^(https?:)?\/\//

export function getMDXComponents(): MDXComponents {
    return {
        Callout,
        DocsUploaderDemo,
        FrameworkTabs,
        ModesDiagram,
        PipelineDiagram,
        TrustModelDiagram,
        DriveOAuthDiagram,
        PlaygroundCta,
        // Syntax-highlighted code card: shiki tokens come from fumadocs-mdx
        // (see source.config.ts + the .shiki activation CSS in globals.css);
        // CodeBlock adds the language label + copy button.
        pre: (props: ComponentProps<'pre'>) => <CodeBlock {...props} />,
        // Wide reference tables (type signatures, provider matrices) exceed the
        // mobile viewport; scroll them horizontally in their own container so a
        // table never forces the whole page to scroll sideways.
        table: (props: ComponentProps<'table'>) => (
            <div className="my-4 overflow-x-auto">
                <table {...props} />
            </div>
        ),
        a: ({ href = '', ...props }) =>
            EXTERNAL_HREF.test(href) || href.startsWith('mailto:') ? (
                <a href={href} target="_blank" rel="noreferrer" {...props} />
            ) : (
                <Link href={href} {...props} />
            ),
    }
}
