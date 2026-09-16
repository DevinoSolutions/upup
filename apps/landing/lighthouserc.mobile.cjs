// Nightly Lighthouse MOBILE PERFORMANCE ratchet for the public site.
//
// Separate from `lighthouserc.cjs` (SEO + Best Practices, desktop defaults)
// because it needs mobile emulation, more runs, and a different port so both
// configs can run back to back in the same job. Every assertion here is `warn`,
// deliberately: the score IS noisy on a shared CI runner, so this exists to make
// a regression visible in the job log and the uploaded report, not to red the
// night. `continue-on-error` is banned by scripts/ci/test-quality-guard.mjs and
// is not needed — a warn-level assertion never fails the run.
//
// Thresholds are the measured post-fix local medians minus 0.05. Raise them when
// the site gets faster; never lower one to make a red go away without saying why.
//
// Run locally after building:
//   pnpm exec turbo run build --filter=@useupup/landing
//   pnpm --filter @useupup/landing run lighthouse:mobile

const PORT = 4464
const page = path => `http://localhost:${PORT}${path}`

module.exports = {
    ci: {
        collect: {
            // Both marketing shapes (home and a framework page share one
            // parameterized layout) plus one docs page, the third template.
            url: [page('/'), page('/react/'), page('/docs/getting-started/')],
            numberOfRuns: 5,
            startServerCommand: `pnpm exec next start -p ${PORT}`,
            startServerReadyPattern: 'Ready in',
            startServerReadyTimeout: 60000,
            settings: {
                onlyCategories: ['performance'],
                // Default lighthouse emulation is already mobile (Moto G Power
                // + simulated 4G); stated here so a future default change
                // cannot silently turn this into a desktop run.
                formFactor: 'mobile',
                screenEmulation: {
                    mobile: true,
                    width: 412,
                    height: 823,
                    deviceScaleFactor: 1.75,
                    disabled: false,
                },
            },
        },
        assert: {
            // Judge the median of the five runs, not the worst one — a single
            // runner hiccup must not read as a regression.
            aggregationMethod: 'median',
            assertMatrix: [
                {
                    // Home + framework pages: the live uploader demo, the
                    // StackBlitz editor and the scene animations all load
                    // behind viewport gates, so the initial page is light.
                    matchingUrlPattern: '^https?://[^/]+/(react/)?$',
                    // Measured medians on this build: / = 0.74, /react/ = 0.71.
                    assertions: {
                        'categories:performance': ['warn', { minScore: 0.66 }],
                    },
                },
                {
                    // Docs pages carry no embeds at all.
                    matchingUrlPattern: '.*/docs/.*',
                    // Measured median on this build: 0.73.
                    assertions: {
                        'categories:performance': ['warn', { minScore: 0.68 }],
                    },
                },
            ],
        },
        upload: {
            target: 'filesystem',
            outputDir: '.lighthouseci-mobile-reports',
        },
    },
}
