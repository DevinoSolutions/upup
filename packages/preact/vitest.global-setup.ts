import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Runs once before the suite. This check must NOT live at config-eval time:
// tools that merely parse the vitest config (knip on a fresh clone with no
// dist/) would throw and misreport every preact spec/devDep as unused.
export default function ensurePreactDist(): void {
    const dist = resolve(
        fileURLToPath(new URL('.', import.meta.url)),
        'dist/index.js',
    )
    if (!existsSync(dist)) {
        throw new Error(
            'packages/preact/dist/index.js missing — run `pnpm --filter @useupup/preact test` (pretest rebuilds the dist), not bare vitest',
        )
    }
}
