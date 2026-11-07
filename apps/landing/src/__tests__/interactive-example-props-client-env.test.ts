import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// DocsUploaderDemo is a client component that imports interactive-example-props
// for DEMO_UPLOAD_TARGETS. Reaching `clientEnv` through `./env` (the
// server-validation module) pulled that module's top-level zod schema, and with
// it the whole zod runtime (~390 KB raw / ~90 KB gzip), into the /docs mobile
// first load. `./client/env` is the zod-free source of the same object.

const source = readFileSync(
    join(__dirname, '..', 'lib', 'interactive-example-props.ts'),
    'utf8',
)

describe('interactive-example-props client bundle', () => {
    it('reads clientEnv from the zod-free client/env module', () => {
        expect(source).toMatch(/from '\.\/client\/env'/)
    })

    it('does not import the server env module', () => {
        expect(source).not.toMatch(/from '(\.\/env|@\/lib\/env)'/)
    })
})
