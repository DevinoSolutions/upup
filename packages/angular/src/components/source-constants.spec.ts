import { describe, it, expect } from 'vitest'
import { FileSource } from '@upupjs/core'
import { sourceNameKeys } from '@upupjs/core/internal'

/**
 * source-constants.spec.ts — angular has no `uploadSourceObject` map (its
 * SourceView switches directly on `store.activeSource()`, see
 * source-view.component.ts). The portable completeness guard here is the
 * `sourceNameKeys` name lookup consumed by source-selector.component.ts:
 * every FileSource must resolve to a translation-key name. Template-level
 * `@switch`/`@default` coverage is a runtime concern guarded by the new
 * `@default` arms in source-view.component.ts (not unit-testable without
 * TestBed, deliberately avoided here).
 */
describe('sourceNameKeys', () => {
    it('covers all FileSource values', () => {
        const sourceCount = Object.keys(FileSource).length
        const mappingCount = Object.keys(sourceNameKeys).length
        expect(mappingCount).toBe(sourceCount)
    })

    it('every FileSource key resolves to a truthy name', () => {
        for (const s of Object.values(FileSource)) {
            expect(sourceNameKeys[s], `sourceNameKeys[${s}]`).toBeTruthy()
        }
    })
})
