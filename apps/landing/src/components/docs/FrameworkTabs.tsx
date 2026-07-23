import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { highlight } from 'fumadocs-core/highlight'
import { FrameworkTabsClient, type FrameworkTab } from './FrameworkTabsClient'

// Mirrors the shiki themes fumadocs-mdx applies to article code fences —
// rehypeCodeDefaultOptions (see source.config.ts) is github-light / github-dark
// with defaultColor:false, emitting --shiki-light/--shiki-dark CSS variables.
// Kept literal (not read from the plugin options object, whose public type
// doesn't surface these) so a tab card stays byte-identical to a `.upup-code`
// block; if source.config.ts ever overrides the fence theme, mirror it here.
const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const

// Anchored via import.meta.url (the same pattern lib/docs/llms.ts uses) rather
// than process.cwd(), so the snippet dir resolves identically under Next's
// build and under vitest. content/docs/_snippets/<topic>/<fw>.<ext> holds real,
// compilable per-framework examples — fumadocs-mdx only compiles .mdx and
// llms.ts's walk() only collects .mdx, so these files never surface as docs
// pages or in llms.txt. They are read from disk here, never bundler-imported.
const __dirname = dirname(fileURLToPath(import.meta.url))
const SNIPPETS_DIR = join(__dirname, '../../../content/docs/_snippets')

// Canonical framework order, each with its snippet filename and highlight
// language. A framework shows up only when its file is present in the topic
// dir, so a topic can offer a subset with no extra wiring.
const FRAMEWORKS: ReadonlyArray<{
    fw: string
    label: string
    file: string
    lang: string
}> = [
    { fw: 'react', label: 'React', file: 'react.tsx', lang: 'tsx' },
    { fw: 'vue', label: 'Vue', file: 'vue.vue', lang: 'vue' },
    { fw: 'svelte', label: 'Svelte', file: 'svelte.svelte', lang: 'svelte' },
    { fw: 'angular', label: 'Angular', file: 'angular.ts', lang: 'ts' },
    { fw: 'vanilla', label: 'Vanilla JS', file: 'vanilla.ts', lang: 'ts' },
    { fw: 'preact', label: 'Preact', file: 'preact.tsx', lang: 'tsx' },
    { fw: 'next', label: 'Next.js', file: 'next.tsx', lang: 'tsx' },
]

function readSnippet(topic: string, file: string): string | null {
    try {
        return readFileSync(join(SNIPPETS_DIR, topic, file), 'utf-8').replace(
            /\s+$/,
            '',
        )
    } catch {
        return null
    }
}

export async function FrameworkTabs({ topic }: { topic: string }) {
    const tabs: FrameworkTab[] = []
    for (const meta of FRAMEWORKS) {
        const code = readSnippet(topic, meta.file)
        if (code === null) continue
        // Highlighted server-side with the SAME shiki themes fumadocs-mdx uses
        // for article code fences (github-light / github-dark, defaultColor
        // false), so a tab card is visually identical to a `.upup-code` block.
        // The result is a server-rendered ReactNode handed to the client tab.
        const highlighted = await highlight(code, {
            lang: meta.lang,
            themes: SHIKI_THEMES,
            defaultColor: false,
        })
        tabs.push({
            fw: meta.fw,
            label: meta.label,
            lang: meta.lang,
            code,
            highlighted,
        })
    }
    if (tabs.length === 0) return null
    return <FrameworkTabsClient tabs={tabs} />
}
