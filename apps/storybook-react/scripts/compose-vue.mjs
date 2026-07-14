// scripts/compose-vue.mjs
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function copyDir(src, dest) {
    if (!existsSync(src)) {
        throw new Error(
            `compose-vue: source not found at ${src} — build @upupjs/storybook-vue first`,
        )
    }
    mkdirSync(dest, { recursive: true })
    cpSync(src, dest, { recursive: true })
}

function main() {
    const here = dirname(fileURLToPath(import.meta.url))
    const vueStatic = resolve(here, '../../storybook-vue/storybook-static')
    const dest = resolve(here, '../storybook-static/vue')
    copyDir(vueStatic, dest)
    // eslint-disable-next-line no-console
    console.log(`compose-vue: copied ${vueStatic} -> ${dest}`)
}

// Run main() only when invoked directly, not when imported by the test.
if (
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    main()
}
