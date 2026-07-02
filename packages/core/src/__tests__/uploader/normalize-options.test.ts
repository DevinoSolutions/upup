import { describe, it, expect } from 'vitest'
import { normalizeUploaderOptions } from '../../uploader/normalize-options'
import { FileSource } from '../../types/file-source'
import { DEFAULT_MAX_FILE_SIZE } from '../../orchestrator/helpers'

describe('normalizeUploaderOptions', () => {
  it('resolves defaults (empty options)', () => {
    const { resolved, coreOptions } = normalizeUploaderOptions({})
    expect(resolved.mini).toBe(false)
    expect(resolved.limit).toBe(10)
    expect(resolved.multiple).toBe(true)
    expect(resolved.mode).toBe('client')
    expect(resolved.maxFileSize).toBe(DEFAULT_MAX_FILE_SIZE)
    expect(resolved.allowedFileTypes).toBeTypeOf('string')
    expect(resolved.lang).toBe('en-US')
    expect(resolved.dir).toBe('ltr')
    expect(resolved.imageEditor).toEqual({ enabled: false, autoOpen: 'never', display: 'inline' })
    expect(coreOptions.limit).toBe(10)
  })

  it('mini forces limit 1 / multiple false', () => {
    const { resolved } = normalizeUploaderOptions({ mini: true, maxFiles: 5 })
    expect(resolved.limit).toBe(1)
    expect(resolved.multiple).toBe(false)
  })

  it('limit precedence: maxFiles ?? restrictions.maxNumberOfFiles ?? 10', () => {
    expect(normalizeUploaderOptions({ maxFiles: 7 }).resolved.limit).toBe(7)
    expect(normalizeUploaderOptions({ restrictions: { maxNumberOfFiles: 3 } }).resolved.limit).toBe(3)
    expect(normalizeUploaderOptions({ maxFiles: 7, restrictions: { maxNumberOfFiles: 3 } }).resolved.limit).toBe(7)
  })

  it('mode auto-resolves to server when serverUrl set without uploadEndpoint', () => {
    expect(normalizeUploaderOptions({ serverUrl: 'https://s' }).resolved.mode).toBe('server')
    expect(normalizeUploaderOptions({ serverUrl: 'https://s', uploadEndpoint: '/u' }).resolved.mode).toBe('client')
    expect(normalizeUploaderOptions({ mode: 'client', serverUrl: 'https://s' }).resolved.mode).toBe('client')
  })

  it('resolvedImageEditor: true -> enabled defaults', () => {
    expect(normalizeUploaderOptions({ imageEditor: true }).resolved.imageEditor)
      .toEqual({ enabled: true, autoOpen: 'never', display: 'inline' })
  })

  it('resolvedImageEditor: object -> merged with defaults', () => {
    expect(normalizeUploaderOptions({ imageEditor: { display: 'modal' } as never }).resolved.imageEditor)
      .toEqual({ enabled: true, autoOpen: 'never', display: 'modal' })
  })

  it('sources normalize + filter; default when absent', () => {
    expect(normalizeUploaderOptions({}).resolved.sources.length).toBeGreaterThan(0)
    const r = normalizeUploaderOptions({ sources: [FileSource.LOCAL] }).resolved
    expect(r.sources).toContain(FileSource.LOCAL)
  })

  it('cloudDrives passes through verbatim to resolved AND coreOptions (one shape end-to-end)', () => {
    const cloudDrives = {
      googleDrive: { clientId: 'g', apiKey: 'k', appId: 'a' },
      oneDrive: { clientId: 'o' },
      dropbox: { clientId: 'd', redirectUri: 'r' },
      box: { clientId: 'b', redirectUri: 'rb' },
    }
    const { resolved, coreOptions } = normalizeUploaderOptions({ cloudDrives })
    expect(resolved.cloudDrives).toBe(cloudDrives)
    expect(coreOptions.cloudDrives).toBe(cloudDrives)
  })

  it('cloudDrives absent -> resolved/coreOptions cloudDrives undefined', () => {
    const { resolved, coreOptions } = normalizeUploaderOptions({})
    expect(resolved.cloudDrives).toBeUndefined()
    expect(coreOptions.cloudDrives).toBeUndefined()
  })

  it('limit floor: non-mini maxFiles 1 -> limit 1 / multiple false; maxFiles 0 -> limit 1', () => {
    const r1 = normalizeUploaderOptions({ maxFiles: 1 }).resolved
    expect(r1.limit).toBe(1)
    expect(r1.multiple).toBe(false)
    expect(normalizeUploaderOptions({ maxFiles: 0 }).resolved.limit).toBe(1)
  })

  it('i18n: bundle code drives lang/dir; locale string fallback', () => {
    expect(normalizeUploaderOptions({ i18n: { locale: 'fr-FR' } }).resolved.lang).toBe('fr-FR')
    expect(normalizeUploaderOptions({}).resolved.dir).toBe('ltr')
  })

  it('accept resolves from restrictions.allowedFileTypes when present', () => {
    const r = normalizeUploaderOptions({ restrictions: { allowedFileTypes: ['image/png', 'image/jpeg'] } }).resolved
    expect(r.allowedFileTypes).toContain('image/png')
  })
})
