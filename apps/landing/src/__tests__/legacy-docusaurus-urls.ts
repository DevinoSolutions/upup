// The deleted Docusaurus app's URL surface, frozen. apps/docs (deleted in
// 59b56df6) served under baseUrl `/documentation/` in TWO route shapes over
// its life, and Search Console still holds URLs of both:
//   - OLDER, routeBasePath 'docs' (monorepo import 8813b1f4, 2025-11, until
//     00eaa6bb, 2026-07-12): pages at `/documentation/docs/<slug>`,
//     generated-index sections at `/documentation/docs/category/<label>`.
//   - NEWER, routeBasePath '/' (00eaa6bb until the deletion): pages at
//     `/documentation/<slug>`, sections at `/documentation/category/<label>`,
//     plus two custom-slug section indexes (`quickstarts`, `comparisons`)
//     that landed AFTER the flip (7f62b8a4) and so only exist in this shape.
// `pages` is every doc of the final tree —
//   git ls-tree -r --name-only 59b56df6^ -- apps/docs/docs
// (each frontmatter `slug:` equals its file path). The older-shape era had a
// subset of these; checking the full list in both shapes is a superset that
// costs nothing and keeps the list single-sourced. The app is gone, so this
// list can never grow — it is a fixture, not a mirror of anything live.
export const LEGACY_DOCUSAURUS = {
    pages: [
        'ai-assistants',
        'api-reference/azure-generate-sas-url',
        'api-reference/s3-generate-presigned-url',
        'api-reference/upupuploader/classnames',
        'api-reference/upupuploader/event-handlers',
        'api-reference/upupuploader/icon-prop',
        'api-reference/upupuploader/image-editor',
        'api-reference/upupuploader/optional-props',
        'api-reference/upupuploader/ref-api',
        'api-reference/upupuploader/required-props',
        'code-examples',
        'comparisons/upup-vs-filepond',
        'comparisons/upup-vs-react-dropzone',
        'comparisons/upup-vs-uploadthing',
        'comparisons/upup-vs-uppy',
        'credentials-configuration',
        'error-handling',
        'getting-started',
        'guides/error-monitoring',
        'guides/headless',
        'guides/modes',
        'guides/server-auth',
        'guides/server-mode-setup',
        'guides/storage-providers',
        'guides/theming',
        'localization',
        'migration/v1-to-v3',
        'migration/v2-to-v2.1',
        'quickstarts/angular',
        'quickstarts/next',
        'quickstarts/preact',
        'quickstarts/react',
        'quickstarts/svelte',
        'quickstarts/vanilla',
        'quickstarts/vue',
        'resumable-uploads',
    ],
    generatedIndexes: ['category/api-reference', 'category/upupuploader'],
    customSlugIndexes: ['quickstarts', 'comparisons'],
}

export interface LegacyUrl {
    path: string
    /** The doc slug for a page URL; null for a bare root or section index. */
    slug: string | null
}

/** Every request path the Docusaurus app served, in both route shapes. */
export function legacyDocusaurusUrls({
    pages,
    generatedIndexes,
    customSlugIndexes,
}: typeof LEGACY_DOCUSAURUS): LegacyUrl[] {
    // [base, the section indexes that existed in that shape]
    const shapes: [string, string[]][] = [
        ['/documentation', [...generatedIndexes, ...customSlugIndexes]],
        ['/documentation/docs', generatedIndexes],
    ]
    const urls: LegacyUrl[] = []
    for (const [base, sectionIndexes] of shapes) {
        urls.push({ path: base, slug: null })
        for (const slug of pages) urls.push({ path: `${base}/${slug}`, slug })
        for (const s of sectionIndexes) {
            urls.push({ path: `${base}/${s}`, slug: null })
        }
    }
    return urls
}
