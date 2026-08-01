'use client'

import { useRef, type ComponentProps } from 'react'
import { CodeCardControls } from './CodeCardControls'

// Wraps the shiki <pre> emitted by fumadocs-mdx. The pre keeps its own
// syntax-highlight classes/styles (see globals.css for the --shiki-* colour
// activation); this shell adds a language label and a copy button over the
// existing dark navy code card. The `icon` attribute fumadocs stamps on the
// pre is only meaningful with fumadocs-ui (forbidden here), so it is dropped.
export function CodeBlock({
    icon: _icon,
    'data-language': language,
    className,
    ...props
}: ComponentProps<'pre'> & { 'data-language'?: string; icon?: string }) {
    const preRef = useRef<HTMLPreElement>(null)

    return (
        <div className="upup-code group relative">
            <CodeCardControls
                language={language}
                getText={() => preRef.current?.textContent ?? ''}
            />
            <pre ref={preRef} className={className} {...props} />
        </div>
    )
}
