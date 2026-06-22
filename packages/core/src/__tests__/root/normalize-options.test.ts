import { describe, it, expect } from 'vitest'
import { normalizeRootOptions } from '../../root/normalize-options'
import { FileSource } from '../../types/file-source'
import { DEFAULT_MAX_FILE_SIZE } from '../../orchestrator/helpers'

describe('normalizeRootOptions', () => {
  it('resolves defaults (empty options)', () => {
    const { resolved, coreOptions } = normalizeRootOptions({})
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
    const { resolved } = normalizeRootOptions({ mini: true, maxFiles: 5 })
    expect(resolved.limit).toBe(1)
    expect(resolved.multiple).toBe(false)
  })

  it('limit precedence: maxFiles ?? restrictions.maxNumberOfFiles ?? 10', () => {
    expect(normalizeRootOptions({ maxFiles: 7 }).resolved.limit).toBe(7)
    expect(normalizeRootOptions({ restrictions: { maxNumberOfFiles: 3 } }).resolved.limit).toBe(3)
    expect(normalizeRootOptions({ maxFiles: 7, restrictions: { maxNumberOfFiles: 3 } }).resolved.limit).toBe(7)
  })

  it('mode auto-resolves to server when serverUrl set without uploadEndpoint', () => {
    expect(normalizeRootOptions({ serverUrl: 'https://s' }).resolved.mode).toBe('server')
    expect(normalizeRootOptions({ serverUrl: 'https://s', uploadEndpoint: '/u' }).resolved.mode).toBe('client')
    expect(normalizeRootOptions({ mode: 'client', serverUrl: 'https://s' }).resolved.mode).toBe('client')
  })

  it('resolvedImageEditor: true -> enabled defaults', () => {
    expect(normalizeRootOptions({ imageEditor: true }).resolved.imageEditor)
      .toEqual({ enabled: true, autoOpen: 'never', display: 'inline' })
  })

  it('resolvedImageEditor: object -> merged with defaults', () => {
    expect(normalizeRootOptions({ imageEditor: { display: 'modal' } as never }).resolved.imageEditor)
      .toEqual({ enabled: true, autoOpen: 'never', display: 'modal' })
  })

  it('sources normalize + filter; default when absent', () => {
    expect(normalizeRootOptions({}).resolved.sources.length).toBeGreaterThan(0)
    const r = normalizeRootOptions({ sources: [FileSource.LOCAL] }).resolved
    expect(r.sources).toContain(FileSource.LOCAL)
  })

  it('cloud-config maps built from options.cloudDrives with redirectUri ?? ""', () => {
    const { resolved, coreOptions } = normalizeRootOptions({
      cloudDrives: {
        googleDrive: { clientId: 'g', apiKey: 'k', appId: 'a' },
        oneDrive: { clientId: 'o' }, // redirectUri omitted -> ''
        dropbox: { clientId: 'd', redirectUri: 'r' },
        box: { clientId: 'b', redirectUri: 'rb' },
      },
    })
    expect(resolved.googleDriveConfigs).toEqual({ google_client_id: 'g', google_api_key: 'k', google_app_id: 'a' })
    expect(resolved.oneDriveConfigs).toEqual({ onedrive_client_id: 'o', redirectUri: '' })
    expect(resolved.dropboxConfigs).toEqual({ dropbox_client_id: 'd', dropbox_redirect_uri: 'r' })
    expect(resolved.boxConfigs).toEqual({ box_client_id: 'b', box_redirect_uri: 'rb' })
    // core gets the orchestrator-shaped cloud config (oneDrive.authority = redirectUri)
    expect(coreOptions.cloudDrives?.oneDrive).toEqual({ clientId: 'o', authority: undefined })
    expect(coreOptions.cloudDrives?.dropbox).toEqual({ appKey: 'd' })
  })

  it('i18n: bundle code drives lang/dir; locale string fallback', () => {
    expect(normalizeRootOptions({ i18n: { locale: 'fr-FR' } }).resolved.lang).toBe('fr-FR')
    expect(normalizeRootOptions({}).resolved.dir).toBe('ltr')
  })

  it('accept resolves from restrictions.allowedFileTypes when present', () => {
    const r = normalizeRootOptions({ restrictions: { allowedFileTypes: ['image/png', 'image/jpeg'] } }).resolved
    expect(r.allowedFileTypes).toContain('image/png')
  })
})
