#!/usr/bin/env node
// Emit the umbrella GitHub Release notes for a upup release to stdout.
//
// Gathers the publishable @upupjs/* set (packages/*/package.json), the release
// version (an anchor package or --version), the previous v-tag (git or
// --previous-tag), and contributors (git shortlog over the range), then hands
// everything to buildReleaseNotes() in scripts/lib/release-notes.mjs.
//
// Usage:
//   node scripts/generate-release-notes.mjs [options] > notes.md
//     --version <x.y.z>       release version (default: anchor package version)
//     --previous-tag <tag>    prior release tag (default: latest v* tag != this)
//     --highlights <file>     Markdown prepended verbatim as the intro
//     --changelog <file>      "what's changed" body (e.g. GitHub auto-notes)
//     --repo <owner/name>     default DevinoSolutions/upup
//     --include-bots          keep [bot] authors in the contributor list
//
// Side effects: reads files + runs `git`. Never writes; never calls the network.

import { readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildReleaseNotes } from './lib/release-notes.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ANCHOR_PACKAGE = '@upupjs/core'

function parseArgs(argv) {
    const flags = { includeBots: false }
    const opts = {}
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a === '--include-bots') flags.includeBots = true
        else if (a.startsWith('--')) opts[a.slice(2)] = argv[++i]
    }
    return { ...opts, ...flags }
}

/** Read every publishable @upupjs/* package (name + version), sorted by name. */
function readPublishablePackages() {
    const dir = join(ROOT, 'packages')
    const packages = []
    for (const entry of readdirSync(dir)) {
        let pkg
        try {
            pkg = JSON.parse(
                readFileSync(join(dir, entry, 'package.json'), 'utf8'),
            )
        } catch {
            continue
        }
        if (pkg.name?.startsWith('@upupjs/') && !pkg.private) {
            packages.push({ name: pkg.name, version: pkg.version })
        }
    }
    return packages.toSorted((a, b) => a.name.localeCompare(b.name))
}

function git(args) {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/** Latest `v*` tag that is not the tag we're about to cut. */
function detectPreviousTag(currentTag) {
    let tags = ''
    try {
        tags = git(['tag', '-l', 'v*', '--sort=-v:refname'])
    } catch {
        return null
    }
    for (const t of tags.split('\n').filter(Boolean)) {
        if (t !== currentTag) return t
    }
    return null
}

/**
 * Contributors over `<previousTag>..HEAD` (or all history), deduped by email,
 * bots dropped unless --include-bots, ranked by commit count.
 */
function gatherContributors(previousTag, includeBots) {
    const range = previousTag ? `${previousTag}..HEAD` : 'HEAD'
    let raw = ''
    try {
        raw = git(['shortlog', '-sne', '--no-merges', range])
    } catch {
        return [] // shallow clone / missing tag → skip the section, never crash
    }
    const byEmail = new Map()
    for (const line of raw.split('\n')) {
        const m = line.match(/^\s*(\d+)\s+(.+?)\s+<([^>]+)>$/)
        if (!m) continue
        const [, count, name, email] = m
        const isBot = /\[bot\]/i.test(name) || /\[bot\]/i.test(email)
        if (isBot && !includeBots) continue
        const prev = byEmail.get(email)
        if (prev) prev.commits += Number(count)
        else byEmail.set(email, { name, commits: Number(count) })
    }
    return [...byEmail.values()].toSorted((a, b) => b.commits - a.commits)
}

function readOptionalFile(path) {
    if (!path) return ''
    try {
        return readFileSync(path, 'utf8')
    } catch {
        return ''
    }
}

function main() {
    const args = parseArgs(process.argv.slice(2))
    const packages = readPublishablePackages()
    if (!packages.length) {
        console.error(
            'generate-release-notes: no publishable @upupjs/* packages found',
        )
        process.exit(1)
    }

    const anchor = packages.find(p => p.name === ANCHOR_PACKAGE) ?? packages[0]
    const version = args.version ?? anchor.version
    const tag = args.tag ?? `v${version}`
    const previousTag = args['previous-tag'] ?? detectPreviousTag(tag)

    const notes = buildReleaseNotes({
        version,
        tag,
        repo: args.repo ?? 'DevinoSolutions/upup',
        packages,
        contributors: gatherContributors(previousTag, args.includeBots),
        previousTag,
        highlights: readOptionalFile(args.highlights),
        changelog: readOptionalFile(args.changelog),
    })
    process.stdout.write(notes)
}

main()
