import pageLastmod from '@/generated/page-lastmod.json'

// ONE reader for the committed page-lastmod snapshot (T-5788). The snapshot
// maps each sitemapped page to the UTC date of the last commit that touched
// what it renders; scripts/seo/page-lastmod.mjs regenerates it from git in the
// husky pre-commit hook, because the deploy image builds without .git. A page
// without an entry THROWS, failing the build: quietly stamping "now" is the
// pattern the snapshot replaced.

const PAGES: Readonly<Record<string, string>> = pageLastmod.pages

/**
 * The page's last-modified date, `YYYY-MM-DD`. `path` is the site path with
 * or without a trailing slash (`/`, `/react`, `/docs/guides/`).
 */
export function pageLastmodDate(path: string): string {
    const key = path === '/' ? '/' : path.replace(/\/+$/, '')
    const stamp = PAGES[key]
    if (!stamp) {
        throw new Error(
            `page-lastmod: no entry for ${key}. Run \`pnpm run seo:lastmod\` (the pre-commit hook does this) and commit apps/landing/src/generated/page-lastmod.json.`,
        )
    }
    return stamp
}

/** Every path the snapshot dates, for the sitemap coverage test. */
export function pageLastmodPaths(): string[] {
    return Object.keys(PAGES)
}
