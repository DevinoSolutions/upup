// Server component: the SITE-WIDE entity graph — Organization + WebSite +
// SoftwareSourceCode.
//
// Rendered from the root layout, so it is on every page including all the docs
// pages. That placement is the point: the brand query "upup" returns this site
// at position ~6 with a 0.3% CTR because nothing on the site ever told a search
// engine that "upup" the word is an entity with a repo, an npm scope, a chat
// server, and a parent company. The bare word is also ambiguous with unrelated
// sites (upup.be, upup.com, "cloud upup"), so every node here carries the
// disambiguating names and the repo/npm identifiers only this project owns.
// Page-level nodes (SoftwareApplication, FAQPage, the docs TechArticle/
// BreadcrumbList) live with their pages and point back here by @id, so the
// whole site describes ONE organization rather than 70-odd unrelated documents.
//
// Every `sameAs` URL is verified live before it is added — a dead profile link
// is a negative entity signal, not a neutral one. Never add AggregateRating or
// Review here: we have no first-party review corpus, and inventing one is both
// a policy violation and a manual-action risk.

import { DISCORD_INVITE_URL } from '@/lib/community-links'
import { canonicalUrl, siteUrl } from '@/lib/site-url'

/** The one Organization node every other node references. */
export const ORGANIZATION_ID = `${siteUrl()}/#organization`
/** The one WebSite node; docs articles declare themselves `isPartOf` it. */
export const WEBSITE_ID = `${siteUrl()}/#website`
/** The one SoftwareApplication node (emitted page-level by ./index). */
export const SOFTWARE_APPLICATION_ID = `${siteUrl()}/#software`
/** The one SoftwareSourceCode node — the repository behind the application. */
const SOURCE_CODE_ID = `${siteUrl()}/#source`

// Verified 2026-09-12: GitHub repo 200; the Discord invite 301s to
// discord.com/invite/… and the invite API returns a live, non-expiring guild.
const GITHUB_URL = 'https://github.com/DevinoSolutions/upup'

// The nine published `@useupup/*` packages. Verified 2026-09-26: every one
// resolves on registry.npmjs.org with a live, non-deprecated `latest`
// (3.3.3; @useupup/server 3.3.0). Core and the canonical React UI lead; the
// order is otherwise the package map in the repo's CLAUDE.md.
const NPM_PACKAGES = [
    'core',
    'react',
    'vue',
    'svelte',
    'angular',
    'vanilla',
    'preact',
    'next',
    'server',
] as const
const NPM_PACKAGE_URLS = NPM_PACKAGES.map(
    pkg => `https://www.npmjs.com/package/@useupup/${pkg}`,
)

const organization = {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'upup',
    // The brand is searched under all of these: the bare word, the npm scope,
    // the handle, and the descriptive phrase. alternateName is how a knowledge
    // graph learns they are the same thing.
    alternateName: ['useupup', '@useupup', 'upup file uploader'],
    url: canonicalUrl(),
    logo: {
        '@type': 'ImageObject',
        url: `${siteUrl()}/img/logo.png`,
    },
    sameAs: [GITHUB_URL, ...NPM_PACKAGE_URLS, DISCORD_INVITE_URL],
    parentOrganization: {
        '@type': 'Organization',
        name: 'Devino',
        url: 'https://devino.ca/',
    },
}

const website = {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'upup',
    // The site-name system reads WebSite.alternateName: the domain and the
    // descriptive phrase are what separate this "upup" from the unrelated
    // upup.be / upup.com results the bare word also matches.
    alternateName: ['useupup', 'upup file uploader', 'useupup.com'],
    url: canonicalUrl(),
    publisher: { '@id': ORGANIZATION_ID },
}

// The repository as its own entity: code-hosting identity (repo URL, language,
// license) is the strongest signal that this "upup" is a software project.
// `targetProduct` names the application node emitted on the product pages.
const sourceCode = {
    '@type': 'SoftwareSourceCode',
    '@id': SOURCE_CODE_ID,
    name: 'upup',
    description:
        'Source code of upup, the open-source file uploader: a headless core plus native UI packages for React, Vue, Svelte, Angular, Vanilla JS, and Preact.',
    codeRepository: GITHUB_URL,
    programmingLanguage: 'TypeScript',
    license: 'https://opensource.org/licenses/MIT',
    url: GITHUB_URL,
    sameAs: NPM_PACKAGE_URLS,
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    targetProduct: { '@id': SOFTWARE_APPLICATION_ID },
}

// One @graph rather than separate scripts: the nodes reference each other by
// @id, and a single graph is what makes those references resolvable in one
// parse.
const entityGraph = {
    '@context': 'https://schema.org',
    '@graph': [organization, website, sourceCode],
}

export default function EntityStructuredData() {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(entityGraph) }}
        />
    )
}
