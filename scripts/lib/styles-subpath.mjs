// Shape check for a framework package's `./styles` subpath export (#357).
//
// TypeScript 6 type-checks side-effect imports, so a bare-string subpath makes
// the documented `import '@upupjs/react/styles'` fail with TS2882. The subpath
// therefore needs BOTH halves, and both are load-bearing:
//   - a `types` condition backed by a shipped declaration, so TS can resolve it;
//   - the SAME unmoved CSS as `default`, so runtime resolution never changes.
// Collapsing either half back is the regression this guards against.

export const STYLES_TYPES_TARGET = './dist/styles.d.ts'
export const STYLES_RUNTIME_TARGET = './dist/tailwind-prefixed.css'
export const STYLES_TYPES_VERSIONS_TARGET = 'dist/styles.d.ts'

/**
 * @param {string} packageName label used in failure messages
 * @param {object} pkg parsed package.json
 * @param {string|undefined} declaration contents of dist/styles.d.ts, if shipped
 * @throws {Error} when the subpath has drifted from the #357 contract
 */
export function checkStylesSubpath(packageName, pkg, declaration) {
    const styles = pkg?.exports?.['./styles']

    if (typeof styles !== 'object' || styles === null) {
        throw new Error(
            `${packageName}: exports["./styles"] must be a conditions object with a types condition, got ${JSON.stringify(styles)}`,
        )
    }
    if (Object.keys(styles)[0] !== 'types') {
        throw new Error(
            `${packageName}: the types condition must come first in exports["./styles"], got ${JSON.stringify(Object.keys(styles))}`,
        )
    }
    if (styles.types !== STYLES_TYPES_TARGET) {
        throw new Error(
            `${packageName}: exports["./styles"].types must be ${STYLES_TYPES_TARGET}, got ${JSON.stringify(styles.types)}`,
        )
    }
    if (styles.default !== STYLES_RUNTIME_TARGET) {
        throw new Error(
            `${packageName}: exports["./styles"].default must stay ${STYLES_RUNTIME_TARGET} (the runtime target must not move), got ${JSON.stringify(styles.default)}`,
        )
    }

    // moduleResolution: "node10" consumers ignore `exports` entirely.
    const fallback = pkg?.typesVersions?.['*']?.styles
    if (
        !Array.isArray(fallback) ||
        fallback[0] !== STYLES_TYPES_VERSIONS_TARGET
    ) {
        throw new Error(
            `${packageName}: typesVersions["*"].styles must map to ${STYLES_TYPES_VERSIONS_TARGET} for node10 resolution, got ${JSON.stringify(fallback)}`,
        )
    }

    if (declaration === undefined) {
        throw new Error(
            `${packageName}: dist/styles.d.ts is missing (build:css must run scripts/emit-styles-dts.mjs)`,
        )
    }
    // An empty file would be a global script, not a module — the export marker
    // is what keeps the subpath a side-effect-only module.
    if (!/^export \{\}$/m.test(declaration)) {
        throw new Error(
            `${packageName}: dist/styles.d.ts must declare an empty module (export {})`,
        )
    }
}
