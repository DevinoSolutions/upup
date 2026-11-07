// Ordering check for packages whose tests read their own dist (#402).
//
// A `pretest: pnpm run build` hook runs inside the package's turbo `test` task,
// outside turbo's graph. The default `test` task depends only on `^build`, so
// when anything else pulls the same package's `build` into a `turbo run test`
// (any dependent's `^build` does), turbo runs that build and the pretest
// rebuild side by side, and their clean-dist/copy-styles steps race over one
// dist folder. `test:coverage` has no pretest, but it reads the same dist and
// would read it while that turbo-scheduled build wipes it. A per-package
// `test` and `test:coverage` override that also depends on the package's own
// `build` puts them in order.

// `build` as a whole script name: not `build:css` or `build-storybook`.
const PRETEST_BUILD = /\bpnpm\s+(run\s+)?build(?![\w:-])/

/**
 * @param {object} turbo parsed turbo.json
 * @param {{ name: string, scripts?: Record<string, string> }[]} packages parsed package.json files
 * @returns {string[]} one message per missing edge; empty when ordered
 */
export function findSelfBuildRaces(turbo, packages) {
    const problems = []
    for (const pkg of packages) {
        const scripts = pkg.scripts ?? {}
        if (!PRETEST_BUILD.test(scripts.pretest ?? '')) continue
        const tasks = ['test', 'test:coverage'].filter(task => scripts[task])
        for (const task of tasks) {
            const id = `${pkg.name}#${task}`
            const dependsOn = turbo?.tasks?.[id]?.dependsOn ?? []
            if (!dependsOn.includes('build')) {
                problems.push(
                    `${id} must depend on "build": ${pkg.name}'s pretest rebuilds its dist, so without that edge it runs alongside a turbo-scheduled ${pkg.name}#build`,
                )
            }
        }
    }
    return problems
}
