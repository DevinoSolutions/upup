// Nightly Lighthouse gate for the public site — SEO + Best Practices ONLY.
// Accessibility is deliberately not asserted here (the nightly axe ratchet in
// `pnpm run e2e:a11y` owns it — Lighthouse's a11y audits are axe-core anyway),
// and Performance is excluded (score is unusably noisy on shared CI runners;
// bundle weight is already gated by size-limit).
//
// Run locally after building:
//   pnpm exec turbo run build --filter=@upupjs/landing
//   pnpm --filter @upupjs/landing run lighthouse
// lhci boots `next start` itself (startServerCommand below).

const PORT = 4463
const page = path => `http://localhost:${PORT}${path}`

module.exports = {
    ci: {
        collect: {
            // Representative page set: the marketing layout twice (home and a
            // framework page share one parameterized layout) and the three
            // docs shapes (root hub, guide hub, deep subpage).
            url: [
                page('/'),
                page('/react/'),
                page('/docs/'),
                page('/docs/guides/storage-providers/'),
                page('/docs/guides/storage/cloudflare-r2/'),
            ],
            numberOfRuns: 3,
            startServerCommand: `pnpm exec next start -p ${PORT}`,
            startServerReadyPattern: 'Ready in',
            startServerReadyTimeout: 60000,
            settings: {
                onlyCategories: ['seo', 'best-practices'],
            },
        },
        assert: {
            assertMatrix: [
                {
                    // Docs pages carry no third-party embeds — held at 100/100.
                    matchingUrlPattern: '.*/docs/.*',
                    assertions: {
                        'categories:seo': ['error', { minScore: 1 }],
                        'categories:best-practices': ['error', { minScore: 1 }],
                    },
                },
                {
                    // Home + framework pages: SEO stays 100; Best Practices is
                    // a ratchet (~3pts under the measured 0.77) because the
                    // StackBlitz embed and the ads tag set third-party cookies
                    // we don't control.
                    matchingUrlPattern: '^https?://[^/]+/(react/)?$',
                    assertions: {
                        'categories:seo': ['error', { minScore: 1 }],
                        'categories:best-practices': [
                            'error',
                            { minScore: 0.74 },
                        ],
                    },
                },
            ],
        },
        upload: {
            target: 'filesystem',
            outputDir: '.lighthouseci-reports',
        },
    },
}
