import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { highlight } from 'fumadocs-core/highlight'
import { DOCS_FRAMEWORK_LIST } from '@/lib/frameworks'
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

// The SAME carve-out list the coverage gate reads. A snippet file may be absent
// only when scripts/docs/check-coverage.mjs also sanctions it, so this
// component and the gate can never disagree about what is allowed to be
// missing. Loading mirrors the gate's loadExceptions(): an absent file means no
// carve-outs (the strictest reading), malformed JSON throws.
const COVERAGE_EXCEPTIONS_PATH = join(
    __dirname,
    '../../../../../scripts/docs/coverage-exceptions.json',
)

// Read per render rather than memoized: one tiny JSON file per <FrameworkTabs>
// embed at build time is free, and a module-scope cache would make an edit to
// the exceptions list invisible until the dev server restarts.
function suppressedPairs(): Set<string> {
    let entries: Array<{ topic: string; file: string }> = []
    if (existsSync(COVERAGE_EXCEPTIONS_PATH)) {
        const parsed = JSON.parse(
            readFileSync(COVERAGE_EXCEPTIONS_PATH, 'utf-8'),
        )
        entries = Array.isArray(parsed) ? parsed : (parsed.exceptions ?? [])
    }
    return new Set(entries.map(e => `${e.topic}/${e.file}`))
}

// Missing content is a build-time defect, not a runtime state: this is a server
// component rendered while the docs are prerendered, so a bad topic name or a
// renamed snippet file must fail the build LOUDLY. Silently rendering nothing
// (or quietly dropping a framework's tab) is how a docs page ships with a
// framework missing and nobody notices.
function readSnippet(topic: string, file: string): string | null {
    const path = join(SNIPPETS_DIR, topic, file)
    // Absence is the one condition a carve-out can excuse; every other read
    // failure (permissions, a directory in the file's place) propagates.
    if (!existsSync(path)) return null
    return readFileSync(path, 'utf-8').replace(/\s+$/, '')
}

export async function FrameworkTabs({ topic }: { topic: string }) {
    const topicDir = join(SNIPPETS_DIR, topic)
    if (!existsSync(topicDir) || !statSync(topicDir).isDirectory()) {
        throw new Error(
            `<FrameworkTabs topic="${topic}"> — no snippet directory at ${topicDir}. ` +
                `Create it with the canonical framework files, or fix the topic name in the MDX.`,
        )
    }

    const suppressed = suppressedPairs()
    const tabs: FrameworkTab[] = []
    for (const meta of DOCS_FRAMEWORK_LIST) {
        const code = readSnippet(topic, meta.docsFile)
        if (code === null) {
            if (suppressed.has(`${topic}/${meta.docsFile}`)) continue
            throw new Error(
                `<FrameworkTabs topic="${topic}"> — missing snippet "${meta.docsFile}" ` +
                    `for ${meta.name} in ${topicDir}. Add the file, or record a ` +
                    `{ topic, file, reason } carve-out in scripts/docs/coverage-exceptions.json ` +
                    `(the same list the docs:snippets:coverage gate enforces).`,
            )
        }
        // Highlighted server-side with the SAME shiki themes fumadocs-mdx uses
        // for article code fences (github-light / github-dark, defaultColor
        // false), so a tab card is visually identical to a `.upup-code` block.
        // The result is a server-rendered ReactNode handed to the client tab.
        const highlighted = await highlight(code, {
            lang: meta.docsLang,
            themes: SHIKI_THEMES,
            defaultColor: false,
        })
        tabs.push({
            fw: meta.id,
            label: meta.name,
            lang: meta.docsLang,
            code,
            highlighted,
        })
    }
    if (tabs.length === 0) {
        throw new Error(
            `<FrameworkTabs topic="${topic}"> — every framework is carved out in ` +
                `scripts/docs/coverage-exceptions.json, so the strip would render empty. ` +
                `Remove the embed or add snippets.`,
        )
    }
    return <FrameworkTabsClient tabs={tabs} />
}
