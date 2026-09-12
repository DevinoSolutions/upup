// Server component: the SITE-WIDE entity graph — Organization + WebSite.
//
// Rendered from the root layout, so it is on every page including all 64 docs
// pages. That placement is the point: the brand query "upup" returns this site
// at position ~6 with a 0.3% CTR because nothing on the site ever told a search
// engine that "upup" the word is an entity with a repo, an npm scope, a chat
// server, and a parent company. Page-level nodes (SoftwareApplication, FAQPage,
// the docs TechArticle/BreadcrumbList) live with their pages and point back
// here by @id, so the whole site describes ONE organization rather than 73
// unrelated documents.
//
// Every `sameAs` URL is verified live before it is added — a dead profile link
// is a negative entity signal, not a neutral one. Never add AggregateRating or
// Review here: we have no first-party review corpus, and inventing one is both
// a policy violation and a manual-action risk.

import { canonicalUrl, siteUrl } from '@/lib/site-url'

/** The one Organization node every other node references. */
export const ORGANIZATION_ID = `${siteUrl()}/#organization`
/** The one WebSite node; docs articles declare themselves `isPartOf` it. */
export const WEBSITE_ID = `${siteUrl()}/#website`
/** The one SoftwareApplication node (emitted page-level by ./index). */
export const SOFTWARE_APPLICATION_ID = `${siteUrl()}/#software`

// Verified 2026-09-12: GitHub repo 200; the npm package resolves on the
// registry (`@useupup/react`, latest 3.3.3); the Discord invite 301s to
// discord.com/invite/… and the invite API returns a live, non-expiring guild.
const GITHUB_URL = 'https://github.com/DevinoSolutions/upup'
const NPM_URL = 'https://www.npmjs.com/package/@useupup/react'
const DISCORD_URL = 'https://discord.gg/ny5WUE9ayc'

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
    sameAs: [GITHUB_URL, NPM_URL, DISCORD_URL],
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
    url: canonicalUrl(),
    publisher: { '@id': ORGANIZATION_ID },
}

// One @graph rather than two scripts: the nodes reference each other by @id,
// and a single graph is what makes those references resolvable in one parse.
const entityGraph = {
    '@context': 'https://schema.org',
    '@graph': [organization, website],
}

export default function EntityStructuredData() {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(entityGraph) }}
        />
    )
}
