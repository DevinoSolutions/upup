import { describe, expect, it } from 'vitest'
import { StorageProvider } from '@upup/core'
import { UpupConfigSchema } from './upup-config.schema.js'

// F-823: apps/mastra deliberately keeps a narrow, self-contained config schema
// that hand-copies core's StorageProvider enum (the `Provider` z.enum in
// upup-config.schema.ts). This guard fails the moment that hand-copied list
// drifts from @upup/core's real exported values — so a provider added, removed,
// or renamed in core can no longer silently leave the agent's schema stale.
// It reads core's values at runtime (not a second hand copy), so the two lists
// can only agree by actually matching.
describe('mastra UpupConfigSchema provider enum vs @upup/core StorageProvider', () => {
    it('matches core StorageProvider values exactly (no drift)', () => {
        const schemaProviders = [
            ...UpupConfigSchema.shape.provider.unwrap().options,
        ].sort()
        const coreProviders = Object.values(StorageProvider).sort()
        expect(schemaProviders).toEqual(coreProviders)
    })
})
