#!/usr/bin/env node

/**
 * Docs link + anchor + redirect-map check gate (`docs:links:check`).
 *
 * Usage:
 *   node scripts/docs/check-links.mjs
 *
 * Standalone, dependency-light (node builtins only). Extends — does NOT
 * replace — the Phase-1 link-integrity unit test in apps/landing
 * (src/__tests__/docs-source.test.ts), which pins every `](/docs/...)` link
 * against real page URLs. This gate adds four things that unit test cannot:
 *
 *   1. INTERNAL LINKS — every internal doc link resolves to a real page:
 *      markdown `](/docs/...)`, markdown relative `](./x)` / `](../x)`, and
 *      JSX `href="/docs/..."` / relative href forms inside MDX. Relative
 *      forms are reported as failures (the corpus convention is absolute
 *      `/docs/...` links; a relative link should be normalized).
 *
 *   2. ANCHORS — a link fragment (`/docs/page/#section`, or a same-page
 *      `](#section)`) must point at a heading that actually renders on the
 *      target page. Heading ids are derived with the SAME slugger fumadocs
 *      renders with: github-slugger v2 (rehype-slug), replicated verbatim
 *      below (regex copied byte-for-byte from
 *      node_modules/github-slugger/regex.js). Verified empirically against
 *      the built docs output — `## Mode (light / dark / system)` renders
 *      `id="mode-light--dark--system"`, `## \`maxRetries\`` renders
 *      `id="maxretries"`, `## Headless: \`UpupThemeProvider\`` renders
 *      `id="headless-upupthemeprovider"` — all reproduced exactly here.
 *
 *   3. REDIRECT MAP — every concrete `/docs/...` destination in the legacy
 *      `/documentation/*` redirect map (apps/landing/next.config.mjs) must
 *      resolve to a real current page URL. A redirect that lands on a 404 is
 *      a failure. Wildcard rules have no concrete target here; leg 4 is what
 *      exercises them.
 *
 *   4. LEGACY URLS — every URL the deleted Docusaurus app ever served, in
 *      BOTH of its route shapes (see LEGACY_DOCUSAURUS below), is run through
 *      the redirect map the way Next matches it (first matching rule wins)
 *      and must land on a real page in exactly one redirect-rule hop — and a
 *      legacy doc page whose slug still exists must land on THAT page, not
 *      a fallback. This is what catches a wildcard that rewrites a legacy
 *      URL into a 404 — e.g. the newer-shape `/documentation/:path*`
 *      capturing an older-shape `/documentation/docs/<slug>` and doubling it
 *      to `/docs/docs/<slug>/`.
 *
 * Page-URL derivation reimplements the slug walk from
 * apps/landing/src/lib/docs/llms.ts (kept intentionally standalone so this
 * script has no build/runtime dependency on the app).
 *
 * Exit non-zero on any failure; a clean run prints a one-line summary.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_DIR = resolve(HERE, '../../apps/landing/content/docs')
const DEFAULT_NEXT_CONFIG = resolve(HERE, '../../apps/landing/next.config.mjs')

// Targets that resolve via next.config.mjs rewrites or Next metadata routes
// (app/robots.ts, app/sitemap.ts) rather than a content page — valid
// link/redirect destinations that own no .mdx file.
const NON_PAGE_TARGETS = new Set([
    '/docs/llms.txt',
    '/docs/llms-full.txt',
    '/llms.txt',
    '/llms-full.txt',
    '/robots.txt',
    '/sitemap.xml',
])

// ── The deleted Docusaurus app's URL surface (frozen) ──────────────────────
// apps/docs (deleted in 59b56df6) served under baseUrl `/documentation/` in
// TWO route shapes over its life, and Search Console still holds URLs of
// both:
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

// Expand a legacy surface into the concrete request paths of both shapes.
// `slug` is set for doc pages (so the check can demand they land on their
// own page when it still exists) and null for the root/section indexes.
export function legacyDocusaurusUrls({
    pages,
    generatedIndexes,
    customSlugIndexes,
}) {
    // [base, the section indexes that existed in that shape]
    const shapes = [
        ['/documentation', [...generatedIndexes, ...customSlugIndexes]],
        ['/documentation/docs', generatedIndexes],
    ]
    const urls = []
    for (const [base, sectionIndexes] of shapes) {
        urls.push({ path: base, slug: null })
        for (const slug of pages) urls.push({ path: `${base}/${slug}`, slug })
        for (const s of sectionIndexes) {
            urls.push({ path: `${base}/${s}`, slug: null })
        }
    }
    return urls
}

// ── github-slugger v2 (rehype-slug) — replicated verbatim ──────────────────
// Regex copied byte-for-byte from github-slugger@2.0.0/regex.js. `slug()` is
// its `slug` export; `Slugger` is its `BananaSlug` class (dedupe by
// appending -1, -2, … on repeated headings). Do not "simplify" the regex —
// it must stay identical to what fumadocs renders with, or anchor checks
// drift from reality.
/* eslint-disable no-control-regex, no-misleading-character-class, no-useless-escape */
// prettier-ignore
const SLUG_REGEX = /[\0-\x1F!-,\.\/:-@\[-\^`\{-\xA9\xAB-\xB4\xB6-\xB9\xBB-\xBF\xD7\xF7˂-˅˒-˟˥-˫˭˯-˿͵͸͹;΀-΅·΋΍΢϶҂԰՗՘՚-՟։-֐־׀׃׆׈-׏׫-׮׳-؏؛-؟٪-٭۔۝۞۩۽۾܀-܏݋݌޲-޿߶-߹߻߼߾߿࠮-࠿࡜-࡟࡫-࢟ࢵࣈ-࣒࣢।॥॰঄঍঎঑঒঩঱঳-঵঺঻৅৆৉৊৏-৖৘-৛৞৤৥৲-৻৽৿਀਄਋-਎਑਒਩਱਴਷਺਻਽੃-੆੉੊੎-੐੒-੘੝੟-੥੶-઀઄઎઒઩઱઴઺઻૆૊૎૏૑-૟૤૥૰-૸଀଄଍଎଑଒଩଱଴଺଻୅୆୉୊୎-୔୘-୛୞୤୥୰୲-஁஄஋-஍஑஖-஘஛஝஠-஢஥-஧஫-஭஺-஽௃-௅௉௎௏௑-௖௘-௥௰-௿఍఑఩఺-఼౅౉౎-౔౗౛-౟౤౥౰-౿಄಍಑಩಴಺಻೅೉೎-೔೗-ೝ೟೤೥೰ೳ-೿഍഑൅൉൏-൓൘-൞൤൥൰-൹඀඄඗-඙඲඼඾඿෇-෉෋-෎෕෗෠-෥෰෱෴-฀฻-฿๏๚-຀຃຅຋຤຦຾຿໅໇໎໏໚໛໠-໿༁-༗༚-༟༪-༴༶༸༺-༽཈཭-཰྅྘྽-࿅࿇-࿿၊-၏႞႟჆჈-჌჎჏჻቉቎቏቗቙቞቟኉኎኏኱኶኷኿዁዆዇዗጑጖጗፛፜፠-፿᎐-᎟᏶᏷᏾-᐀᙭᙮ ᚛-᚟᛫-᛭᛹-᛿ᜍ᜕-ᜟ᜵-᜿᝔-᝟᝭᝱᝴-᝿។-៖៘-៛៞៟៪-᠊᠎᠏᠚-᠟᡹-᡿᢫-᢯᣶-᣿᤟᤬-᤯᤼-᥅᥮᥯᥵-᥿᦬-᦯᧊-᧏᧚-᧿᨜-᨟᩟᩽᩾᪊-᪏᪚-᪦᪨-᪯᫁-᫿ᭌ-᭏᭚-᭪᭴-᭿᯴-᯿᰸-᰿᱊-᱌᱾᱿Ᲊ-᲏᲻᲼᳀-᳏᳓᳻-᳿᷺἖἗἞἟὆὇὎὏὘὚὜὞὾὿᾵᾽᾿-῁῅῍-῏῔῕῜-῟῭-῱῵´-‾⁁-⁓⁕-⁰⁲-⁾₀-₏₝-⃏⃱-℁℃-℆℈℉℔№-℘℞-℣℥℧℩℮℺℻⅀-⅄⅊-⅍⅏-⅟↉-⒵⓪-⯿Ⱟⱟ⳥-⳪⳴-⳿⴦⴨-⴬⴮⴯⵨-⵮⵰-⵾⶗-⶟⶧⶯⶷⶿⷇⷏⷗⷟⸀-⸮⸰-〄〈-〠〰〶〷〽-぀゗゘゛゜゠・㄀-㄄㄰㆏-㆟㇀-㇯㈀-㏿䷀-䷿鿽-鿿꒍-꓏꓾꓿꘍-꘏꘬-꘿꙳꙾꛲-꜖꜠꜡꞉꞊ꟀꟁꟋ-ꟴ꠨-꠫꠭-꠿꡴-꡿꣆-꣏꣚-꣟꣸-꣺꣼꤮꤯꥔-꥟꥽-꥿꧁-꧎꧚-꧟꧿꨷-꨿꩎꩏꩚-꩟꩷-꩹꫃-꫚꫞꫟꫰꫱꫷-꬀꬇꬈꬏꬐꬗-꬟꬧꬯꭛꭪-꭯꯫꯮꯯꯺-꯿힤-힯퟇-퟊퟼-퟿-﩮﩯﫚-﫿﬇-﬒﬘-﬜﬩﬷﬽﬿﭂﭅﮲-﯒﴾-﵏﶐﶑﷈-﷯﷼-﷿︐-︟︰-︲︵-﹌﹐-﹯﹵﻽-／：-＠［-＾｀｛-･﾿-￁￈￉￐￑￘￙￝-￿]|\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDD3F\uDD75-\uDDFC\uDDFE-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEDF\uDEE1-\uDEFF\uDF20-\uDF2C\uDF4B-\uDF4F\uDF7B-\uDF7F\uDF9E\uDF9F\uDFC4-\uDFC7\uDFD0\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56-\uDC5F\uDC77-\uDC7F\uDC9F-\uDCDF\uDCF3\uDCF6-\uDCFF\uDD16-\uDD1F\uDD3A-\uDD7F\uDDB8-\uDDBD\uDDC0-\uDDFF\uDE04\uDE07-\uDE0B\uDE14\uDE18\uDE36\uDE37\uDE3B-\uDE3E\uDE40-\uDE5F\uDE7D-\uDE7F\uDE9D-\uDEBF\uDEC8\uDEE7-\uDEFF\uDF36-\uDF3F\uDF56-\uDF5F\uDF73-\uDF7F\uDF92-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCFF\uDD28-\uDD2F\uDD3A-\uDE7F\uDEAA\uDEAD-\uDEAF\uDEB2-\uDEFF\uDF1D-\uDF26\uDF28-\uDF2F\uDF51-\uDFAF\uDFC5-\uDFDF\uDFF7-\uDFFF]|\uD804[\uDC47-\uDC65\uDC70-\uDC7E\uDCBB-\uDCCF\uDCE9-\uDCEF\uDCFA-\uDCFF\uDD35\uDD40-\uDD43\uDD48-\uDD4F\uDD74\uDD75\uDD77-\uDD7F\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDFF\uDE12\uDE38-\uDE3D\uDE3F-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEA9-\uDEAF\uDEEB-\uDEEF\uDEFA-\uDEFF\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A\uDF45\uDF46\uDF49\uDF4A\uDF4E\uDF4F\uDF51-\uDF56\uDF58-\uDF5C\uDF64\uDF65\uDF6D-\uDF6F\uDF75-\uDFFF]|\uD805[\uDC4B-\uDC4F\uDC5A-\uDC5D\uDC62-\uDC7F\uDCC6\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDB6\uDDB7\uDDC1-\uDDD7\uDDDE-\uDDFF\uDE41-\uDE43\uDE45-\uDE4F\uDE5A-\uDE7F\uDEB9-\uDEBF\uDECA-\uDEFF\uDF1B\uDF1C\uDF2C-\uDF2F\uDF3A-\uDFFF]|\uD806[\uDC3B-\uDC9F\uDCEA-\uDCFE\uDD07\uDD08\uDD0A\uDD0B\uDD14\uDD17\uDD36\uDD39\uDD3A\uDD44-\uDD4F\uDD5A-\uDD9F\uDDA8\uDDA9\uDDD8\uDDD9\uDDE2\uDDE5-\uDDFF\uDE3F-\uDE46\uDE48-\uDE4F\uDE9A-\uDE9C\uDE9E-\uDEBF\uDEF9-\uDFFF]|\uD807[\uDC09\uDC37\uDC41-\uDC4F\uDC5A-\uDC71\uDC90\uDC91\uDCA8\uDCB7-\uDCFF\uDD07\uDD0A\uDD37-\uDD39\uDD3B\uDD3E\uDD48-\uDD4F\uDD5A-\uDD5F\uDD66\uDD69\uDD8F\uDD92\uDD99-\uDD9F\uDDAA-\uDEDF\uDEF7-\uDFAF\uDFB1-\uDFFF]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD80B\uD80E-\uD810\uD812-\uD819\uD824-\uD82B\uD82D\uD82E\uD830-\uD833\uD837\uD839\uD83D\uD83F\uD87B-\uD87D\uD87F\uD885-\uDB3F\uDB41-\uDBFF][\uDC00-\uDFFF]|\uD80D[\uDC2F-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDECF\uDEEE\uDEEF\uDEF5-\uDEFF\uDF37-\uDF3F\uDF44-\uDF4F\uDF5A-\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDE3F\uDE80-\uDEFF\uDF4B-\uDF4E\uDF88-\uDF8E\uDFA0-\uDFDF\uDFE2\uDFE5-\uDFEF\uDFF2-\uDFFF]|\uD821[\uDFF8-\uDFFF]|\uD823[\uDCD6-\uDCFF\uDD09-\uDFFF]|\uD82C[\uDD1F-\uDD4F\uDD53-\uDD63\uDD68-\uDD6F\uDEFC-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A-\uDC9C\uDC9F-\uDFFF]|\uD834[\uDC00-\uDD64\uDD6A-\uDD6C\uDD73-\uDD7A\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDE41\uDE45-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3\uDFCC\uDFCD]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85-\uDE9A\uDEA0\uDEB0-\uDFFF]|\uD838[\uDC07\uDC19\uDC1A\uDC22\uDC25\uDC2B-\uDCFF\uDD2D-\uDD2F\uDD3E\uDD3F\uDD4A-\uDD4D\uDD4F-\uDEBF\uDEFA-\uDFFF]|\uD83A[\uDCC5-\uDCCF\uDCD7-\uDCFF\uDD4C-\uDD4F\uDD5A-\uDFFF]|\uD83B[\uDC00-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDFFF]|\uD83C[\uDC00-\uDD2F\uDD4A-\uDD4F\uDD6A-\uDD6F\uDD8A-\uDFFF]|\uD83E[\uDC00-\uDFEF\uDFFA-\uDFFF]|\uD869[\uDEDE-\uDEFF]|\uD86D[\uDF35-\uDF3F]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEA2-\uDEAF]|\uD87A[\uDFE1-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uD884[\uDF4B-\uDFFF]|\uDB40[\uDC00-\uDCFF\uDDF0-\uDFFF]/g
/* eslint-enable no-control-regex, no-misleading-character-class, no-useless-escape */

export function slug(value) {
    return value.toLowerCase().replace(SLUG_REGEX, '').replace(/ /g, '-')
}

class Slugger {
    constructor() {
        this.occurrences = Object.create(null)
    }
    slug(value) {
        const original = slug(value)
        let result = original
        while (this.occurrences[result] !== undefined) {
            this.occurrences[original]++
            result = original + '-' + this.occurrences[original]
        }
        this.occurrences[result] = 0
        return result
    }
}

// ── Page-URL derivation (mirrors apps/landing/src/lib/docs/llms.ts) ─────────

function walkMdx(dir) {
    const out = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) out.push(...walkMdx(full))
        else if (entry.name.endsWith('.mdx')) out.push(full)
    }
    return out
}

// A folder hub (`guides/index.mdx`) is served at the folder URL, exactly like
// the root `index.mdx` is served at /docs — strip a trailing `index` segment
// at any depth, not just the root.
function slugFromPath(contentDir, filePath) {
    const rel = relative(contentDir, filePath).split(sep).join('/')
    const withoutExt = rel.replace(/\.mdx$/, '')
    return withoutExt.replace(/(^|\/)index$/, '')
}

// Canonical, comparison-normalized page path (no host, no trailing slash).
function pagePath(pageSlug) {
    return pageSlug ? `/docs/${pageSlug}` : '/docs'
}

// ── Heading-id extraction ──────────────────────────────────────────────────

// Blank out fenced code blocks while preserving line count, so a `#` comment
// or a `](/docs/...)` example inside a fence is never mistaken for a heading
// or a real link.
function blankFences(body) {
    const lines = body.split(/\r?\n/)
    let fence = null
    return lines
        .map(line => {
            const open = line.match(/^\s*(`{3,}|~{3,})/)
            if (open) {
                const marker = open[1][0]
                if (!fence) {
                    fence = marker
                    return ''
                }
                if (line.trim().startsWith(fence)) {
                    fence = null
                    return ''
                }
                return ''
            }
            return fence ? '' : line
        })
        .join('\n')
}

function stripFrontmatter(raw) {
    return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
}

// Reduce a heading's markdown source to the plain text content rehype sees,
// then honor fumadocs' explicit `## Heading [#custom-id]` anchor syntax.
function headingIdFor(slugger, rawHeadingText) {
    let text = rawHeadingText
    const explicit = text.match(/\s*\[#([^\]\s]+)\]\s*$/)
    if (explicit) {
        return explicit[1]
    }
    text = text
        .replace(/`([^`]*)`/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
    // Strip inline HTML tags to a fixpoint: a single pass over `<[^>]+>` can
    // leave a reassembled tag behind (e.g. `<sp<b>an>`), so repeat until stable.
    let previous
    do {
        previous = text
        text = text.replace(/<[^>]+>/g, '')
    } while (text !== previous)
    text = text.trim()
    return slugger.slug(text)
}

function headingIds(rawFile) {
    const body = blankFences(stripFrontmatter(rawFile))
    const slugger = new Slugger()
    const ids = new Set()
    for (const line of body.split(/\r?\n/)) {
        const m = line.match(/^(#{1,6})\s+(.+?)\s*$/)
        if (!m) continue
        ids.add(headingIdFor(slugger, m[2]))
    }
    return ids
}

// ── Link + redirect extraction ─────────────────────────────────────────────

const MD_LINK_RE = /\]\((\/docs\/[^)\s]*|\.\.?\/[^)\s]*|#[^)\s]*)\)/g
const HREF_RE = /href="(\/docs\/[^"]*|\.\.?\/[^"]*|#[^"]*)"/g

// Resolve `./x` / `../x` against the page it appears on.
function resolveRelative(fromPagePath, rel) {
    const base = fromPagePath.endsWith('/') ? fromPagePath : fromPagePath + '/'
    const u = new URL(rel, 'http://x' + base)
    return u.pathname.replace(/\/$/, '') + (u.hash || '')
}

function splitFragment(target) {
    const i = target.indexOf('#')
    if (i < 0) return [target, null]
    return [target.slice(0, i), target.slice(i + 1)]
}

// Pull `{ source, destination }` pairs out of the `async redirects()` block of
// next.config.mjs (text-scanned so the script needs none of the app's deps).
export function extractRedirects(configText) {
    const start = configText.indexOf('async redirects()')
    if (start < 0) return []
    const region = configText.slice(start)
    const pairs = []
    const re = /source:\s*'([^']+)'\s*,\s*destination:\s*'([^']+)'/g
    let m
    while ((m = re.exec(region))) {
        pairs.push({ source: m[1], destination: m[2] })
    }
    return pairs
}

// ── Redirect simulation (Next's first-match semantics) ─────────────────────
// A deliberately small subset of path-to-regexp: literal segments, `:name`
// (exactly one segment), and a final `:name*` (zero or more). Semantics
// verified against next@16.3.3's own getPathMatch + prepareDestination:
// `/documentation/docs/:path*` matches `/documentation/docs` with an EMPTY
// `path` (the `/` before `:path*` belongs to the token), renders
// `/docs/:path*/` as `/docs/`, and does NOT match `/documentation/docsx`.
// Anything richer (regex groups, `?`, `+`) is refused loudly: silently
// treating an unknown pattern as "no match" would let a real rule that
// shadows a legacy URL go unsimulated.
const PARAM_RE = /^:([A-Za-z_]\w*)(\*?)$/

function compileSource(source) {
    const segments = source.split('/').slice(1)
    const tokens = []
    segments.forEach((seg, i) => {
        const p = seg.match(PARAM_RE)
        if (p) {
            if (p[2] === '*' && i !== segments.length - 1) {
                throw new Error(`\`:${p[1]}*\` is only supported last`)
            }
            tokens.push({ param: p[1], star: p[2] === '*' })
        } else if (/[:()?+*{}\\]/.test(seg)) {
            throw new Error(`segment \`${seg}\` is not a supported pattern`)
        } else {
            tokens.push({ literal: seg })
        }
    })
    return tokens
}

function matchTokens(tokens, pathname) {
    const parts = pathname === '/' ? [''] : pathname.split('/').slice(1)
    const params = {}
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i]
        if (t.star) {
            params[t.param] = parts.slice(i)
            return params
        }
        if (i >= parts.length) return null
        if (t.param) {
            if (parts[i] === '') return null
            params[t.param] = parts[i]
        } else if (t.literal !== parts[i]) {
            return null
        }
    }
    return parts.length === tokens.length ? params : null
}

function renderDestination(destination, params) {
    return destination
        .replace(/\/:([A-Za-z_]\w*)\*/g, (_, name) =>
            params[name]?.length ? '/' + params[name].join('/') : '',
        )
        .replace(/:([A-Za-z_]\w*)/g, (_, name) => params[name] ?? '')
}

// Next strips the trailing slash before matching a source (trailingSlash:
// true), so every hop is matched on the unslashed path.
const unslash = p => p.replace(/\/+$/, '') || '/'

// Follow `pathname` through the redirect list the way a browser would: each
// request takes the FIRST matching rule. Returns every rule hop taken and
// the path it finally rests on. `compiled` is the output of
// compileRedirects(); a loop is cut off at `maxHops`.
export function resolveRedirect(compiled, pathname, maxHops = 5) {
    const hops = []
    let current = unslash(pathname)
    for (let n = 0; n < maxHops; n++) {
        let next = null
        for (const rule of compiled) {
            const params = matchTokens(rule.tokens, current)
            if (!params) continue
            next = renderDestination(rule.destination, params)
            hops.push({ source: rule.source, to: next })
            break
        }
        if (next === null) break
        current = unslash(next)
    }
    return { hops, final: current }
}

// Compile the extracted pairs; an unsupported pattern becomes an `error`
// entry rather than a rule, so the caller can report it.
export function compileRedirects(redirects) {
    const compiled = []
    const errors = []
    for (const { source, destination } of redirects) {
        try {
            compiled.push({
                source,
                destination,
                tokens: compileSource(source),
            })
        } catch (err) {
            errors.push({ source, destination, reason: err.message })
        }
    }
    return { compiled, errors }
}

// ── Core check ─────────────────────────────────────────────────────────────

export function checkDocsLinks({
    contentDir = DEFAULT_CONTENT_DIR,
    nextConfigPath = DEFAULT_NEXT_CONFIG,
    legacy = LEGACY_DOCUSAURUS,
} = {}) {
    const files = walkMdx(contentDir).toSorted()
    const pages = files.map(file => {
        const s = slugFromPath(contentDir, file)
        return { file, path: pagePath(s) }
    })
    const validPages = new Set(pages.map(p => p.path))
    const idsByPage = new Map()
    for (const p of pages) {
        idsByPage.set(p.path, headingIds(readFileSync(p.file, 'utf8')))
    }

    const failures = []
    let linksChecked = 0
    let anchorsChecked = 0

    for (const page of pages) {
        const raw = readFileSync(page.file, 'utf8')
        const lines = blankFences(stripFrontmatter(raw)).split(/\r?\n/)
        lines.forEach((line, idx) => {
            const lineNo = idx + 1
            for (const re of [MD_LINK_RE, HREF_RE]) {
                re.lastIndex = 0
                let m
                while ((m = re.exec(line))) {
                    const original = m[1]
                    let target = original
                    let isRelative = false
                    if (target.startsWith('./') || target.startsWith('../')) {
                        isRelative = true
                        target = resolveRelative(page.path, target)
                    }
                    let [pathPart, fragment] = splitFragment(target)
                    if (pathPart === '') pathPart = page.path // same-page anchor
                    pathPart = pathPart.replace(/\/$/, '')

                    // Only internal doc targets are our concern.
                    if (!pathPart.startsWith('/docs')) continue
                    linksChecked++

                    if (isRelative) {
                        failures.push({
                            kind: 'RELATIVE',
                            file: page.file,
                            line: lineNo,
                            link: original,
                            reason: `relative link should be an absolute /docs/... link (resolves to ${pathPart}${fragment ? '#' + fragment : ''})`,
                        })
                    }

                    const isValidPage =
                        validPages.has(pathPart) ||
                        NON_PAGE_TARGETS.has(pathPart)
                    if (!isValidPage) {
                        failures.push({
                            kind: 'LINK',
                            file: page.file,
                            line: lineNo,
                            link: original,
                            reason: `page ${pathPart} does not exist`,
                        })
                        continue
                    }

                    if (fragment) {
                        anchorsChecked++
                        const ids = idsByPage.get(pathPart)
                        // A fragment on an llms.txt / rewrite target has no
                        // heading set to check against; skip those.
                        if (ids && !ids.has(fragment)) {
                            failures.push({
                                kind: 'ANCHOR',
                                file: page.file,
                                line: lineNo,
                                link: original,
                                reason: `#${fragment} is not a heading on ${pathPart}`,
                            })
                        }
                    }
                }
            }
        })
    }

    // Redirect map: every concrete /docs/... destination must resolve.
    const redirects = extractRedirects(readFileSync(nextConfigPath, 'utf8'))
    // extractRedirects text-scans for `async redirects()` + single-quoted
    // pairs; a config refactor (rename, double quotes, template literals)
    // would silently drop the redirect leg to zero. The legacy map is a
    // permanent fixture, so zero extracted pairs means the SCANNER broke,
    // not that the redirects went away — fail loudly instead of degrading.
    if (redirects.length === 0) {
        failures.push({
            kind: 'REDIRECT',
            file: nextConfigPath,
            line: 0,
            link: '(none)',
            reason: 'no source/destination pairs extracted from next.config.mjs — the redirects() scanner no longer matches the config; update extractRedirects()',
        })
    }
    let redirectsChecked = 0
    for (const { source, destination } of redirects) {
        if (destination.includes(':')) continue // wildcard/param pass-through
        const dest = destination.replace(/\/$/, '') || '/docs'
        if (!dest.startsWith('/docs/') && dest !== '/docs') {
            // Non-/docs redirect target (e.g. /llms.txt) — valid if a known
            // rewrite target, otherwise flag it.
            if (NON_PAGE_TARGETS.has(dest)) redirectsChecked++
            else
                failures.push({
                    kind: 'REDIRECT',
                    file: nextConfigPath,
                    line: 0,
                    link: `${source} -> ${destination}`,
                    reason: `redirect target ${destination} is not a known page or rewrite target`,
                })
            continue
        }
        redirectsChecked++
        if (!validPages.has(dest) && !NON_PAGE_TARGETS.has(dest)) {
            failures.push({
                kind: 'REDIRECT',
                file: nextConfigPath,
                line: 0,
                link: `${source} -> ${destination}`,
                reason: `redirect target ${destination} resolves to no page`,
            })
        }
    }

    // Legacy URLs: every URL the Docusaurus app served, both route shapes,
    // must land on a real page in ONE rule hop (Next's own trailing-slash
    // normalization is not a rule hop). Skipped when the scanner extracted
    // nothing — that is already reported above, and one "matches no rule"
    // line per legacy URL would only bury it.
    let legacyUrlsChecked = 0
    if (redirects.length > 0) {
        const { compiled, errors } = compileRedirects(redirects)
        for (const e of errors) {
            failures.push({
                kind: 'REDIRECT',
                file: nextConfigPath,
                line: 0,
                link: `${e.source} -> ${e.destination}`,
                reason: `source pattern cannot be simulated (${e.reason}) — extend compileSource() so the legacy-URL leg stays faithful`,
            })
        }
        for (const { path, slug } of legacyDocusaurusUrls(legacy)) {
            legacyUrlsChecked++
            const { hops, final } = resolveRedirect(compiled, path)
            const trail = [path, ...hops.map(h => h.to)].join(' -> ')
            const fail = reason =>
                failures.push({
                    kind: 'LEGACY',
                    file: nextConfigPath,
                    line: 0,
                    link: trail,
                    reason,
                })
            if (hops.length === 0) {
                fail(`legacy URL ${path} matches no redirect rule`)
                continue
            }
            if (!validPages.has(final)) {
                fail(
                    `legacy URL ${path} lands on ${hops.at(-1).to}, which is no page`,
                )
                continue
            }
            if (hops.length > 1) {
                fail(
                    `legacy URL ${path} takes ${hops.length} redirect hops; point its rule straight at ${final}/`,
                )
            }
            // A legacy page whose slug still exists must land on THAT page:
            // a catch-all to /docs/ would pass "is a page" while throwing
            // away every URL's ranking.
            if (
                slug &&
                validPages.has(pagePath(slug)) &&
                final !== pagePath(slug)
            ) {
                fail(
                    `legacy URL ${path} lands on ${final}, but its own page ${pagePath(slug)} exists`,
                )
            }
        }
    }

    return {
        failures,
        counts: {
            pages: pages.length,
            linksChecked,
            anchorsChecked,
            redirectsChecked,
            legacyUrlsChecked,
        },
    }
}

// ── CLI ────────────────────────────────────────────────────────────────────

function main() {
    const { failures, counts } = checkDocsLinks()
    if (failures.length > 0) {
        console.error(
            `docs:links:check FAILED — ${failures.length} problem(s):\n`,
        )
        for (const f of failures) {
            const loc = f.line ? `${f.file}:${f.line}` : f.file
            console.error(
                `  [${f.kind}] ${loc}\n    ${f.link}\n    ${f.reason}`,
            )
        }
        process.exit(1)
    }
    console.log(
        `docs:links:check OK — ${counts.linksChecked} links, ` +
            `${counts.anchorsChecked} anchors, ` +
            `${counts.redirectsChecked} redirect targets, ` +
            `${counts.legacyUrlsChecked} legacy URLs checked ` +
            `across ${counts.pages} pages`,
    )
}

if (
    import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1] === fileURLToPath(import.meta.url)
) {
    main()
}
