// Pure builders for the umbrella GitHub Release notes (one `v<version>` release
// covering every published @upupjs/* package). Kept side-effect-free so
// scripts/lib/release-notes.test.mjs can pin the exact Markdown; the CLI
// (scripts/generate-release-notes.mjs) gathers the inputs (fs + git) and calls
// buildReleaseNotes(). All @upupjs/* packages are `fixed` in changesets, so a
// release shares ONE version — but the packages table still prints each
// package's own version, so any accidental divergence stays visible.

const NPM_ORG_URL = 'https://www.npmjs.com/org/upupjs'

/** npm version-pinned package page, e.g. .../package/@upupjs/core/v/3.1.0 */
export function npmPackageUrl(name, version) {
    return `https://www.npmjs.com/package/${name}/v/${version}`
}

/** GitHub compare link between two refs. */
export function compareUrl(repo, previousTag, tag) {
    return `https://github.com/${repo}/compare/${previousTag}...${tag}`
}

function packagesSection(packages) {
    const rows = packages
        .map(
            p =>
                `| [\`${p.name}\`](${npmPackageUrl(p.name, p.version)}) | \`${p.version}\` |`,
        )
        .join('\n')
    return [
        '## 📦 Packages',
        '',
        `All ${packages.length} packages are published to npm under the [\`@upupjs\`](${NPM_ORG_URL}) scope:`,
        '',
        '| Package | Version |',
        '| --- | --- |',
        rows,
    ].join('\n')
}

function installSection() {
    return [
        '## 📥 Install',
        '',
        '```bash',
        '# pick your framework',
        'npm i @upupjs/react     # or @upupjs/vue · @upupjs/svelte · @upupjs/angular · @upupjs/vanilla · @upupjs/preact',
        '',
        '# server mode — presign + proxy uploads to any S3-compatible storage',
        'npm i @upupjs/server    # plus @upupjs/next for Next.js route handlers',
        '```',
    ].join('\n')
}

function changelogSection({ repo, previousTag, tag, changelog }) {
    const parts = []
    const body = (changelog || '').trim()
    if (body) parts.push(body)
    if (previousTag) {
        parts.push(
            `**Full changelog:** [\`${previousTag}...${tag}\`](${compareUrl(repo, previousTag, tag)})`,
        )
    }
    if (!parts.length) return ''
    return ['## 📝 What’s changed', '', parts.join('\n\n')].join('\n')
}

/** Render one contributor line: prefer a GitHub @handle, else the git name. */
export function contributorLine(contributor) {
    const who = contributor.handle ? `@${contributor.handle}` : contributor.name
    if (!contributor.commits) return `- ${who}`
    const plural = contributor.commits === 1 ? 'commit' : 'commits'
    return `- ${who} — ${contributor.commits} ${plural}`
}

function contributorsSection(contributors) {
    if (!contributors.length) return ''
    return [
        '## 👥 Contributors',
        '',
        'Thanks to everyone who shipped this release:',
        '',
        contributors.map(contributorLine).join('\n'),
    ].join('\n')
}

/**
 * Assemble the full release-notes Markdown from already-gathered inputs.
 *
 * @param {object}   o
 * @param {string}   o.version        e.g. "3.1.0" (no leading v)
 * @param {string}   [o.tag]          defaults to `v${version}`
 * @param {string}   [o.repo]         "owner/name"
 * @param {Array<{name:string,version:string}>} o.packages  publishable set
 * @param {Array<{name?:string,handle?:string,commits?:number}>} [o.contributors]
 * @param {string|null} [o.previousTag]  prior release tag for the compare link
 * @param {string}   [o.highlights]   curated Markdown prepended verbatim
 * @param {string}   [o.changelog]    "what's changed" body (e.g. GitHub auto-notes)
 * @param {string}   [o.siteUrl]      docs URL for the footer
 * @returns {string} Markdown (trailing newline)
 */
export function buildReleaseNotes({
    version,
    tag,
    repo = 'DevinoSolutions/upup',
    packages = [],
    contributors = [],
    previousTag = null,
    highlights = '',
    changelog = '',
    siteUrl = 'https://useupup.com',
}) {
    if (!version) throw new Error('buildReleaseNotes: `version` is required')
    if (!packages.length)
        throw new Error('buildReleaseNotes: `packages` must not be empty')
    const resolvedTag = tag || `v${version}`

    const sections = []
    const preamble = (highlights || '').trim()
    if (preamble) sections.push(preamble)
    sections.push(packagesSection(packages))
    sections.push(installSection())
    const changes = changelogSection({
        repo,
        previousTag,
        tag: resolvedTag,
        changelog,
    })
    if (changes) sections.push(changes)
    const credits = contributorsSection(contributors)
    if (credits) sections.push(credits)
    sections.push(
        `---\n\n📖 [Docs](${siteUrl}) · 🐙 [${repo}](https://github.com/${repo}) · MIT licensed`,
    )

    return sections.join('\n\n') + '\n'
}
