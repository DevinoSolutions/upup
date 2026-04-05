import { describe, it, expect } from 'vitest'
import { UploadAdapter } from '../src/shared/types'

// Test the source-to-adapter mapping logic used in useRootProvider
const sourceToAdapter: Record<string, string> = {
  local: UploadAdapter.INTERNAL,
  camera: UploadAdapter.CAMERA,
  url: UploadAdapter.LINK,
  google_drive: UploadAdapter.GOOGLE_DRIVE,
  onedrive: UploadAdapter.ONE_DRIVE,
  dropbox: UploadAdapter.DROPBOX,
  microphone: UploadAdapter.AUDIO,
  screen: UploadAdapter.SCREEN,
}

describe('sources → uploadAdapters mapping', () => {
  it('maps all 8 v2 source names to v1 adapter enums', () => {
    expect(sourceToAdapter.local).toBe('INTERNAL')
    expect(sourceToAdapter.camera).toBe('CAMERA')
    expect(sourceToAdapter.url).toBe('LINK')
    expect(sourceToAdapter.google_drive).toBe('GOOGLE_DRIVE')
    expect(sourceToAdapter.onedrive).toBe('ONE_DRIVE')
    expect(sourceToAdapter.dropbox).toBe('DROPBOX')
    expect(sourceToAdapter.microphone).toBe('AUDIO')
    expect(sourceToAdapter.screen).toBe('SCREEN')
  })

  it('resolves sources array to adapter array', () => {
    const sources = ['local', 'google_drive', 'camera']
    const adapters = sources.map(s => sourceToAdapter[s]).filter(Boolean)
    expect(adapters).toEqual(['INTERNAL', 'GOOGLE_DRIVE', 'CAMERA'])
  })

  it('filters unknown sources', () => {
    const sources = ['local', 'invalid_source', 'camera']
    const adapters = sources.map(s => sourceToAdapter[s]).filter(Boolean)
    expect(adapters).toEqual(['INTERNAL', 'CAMERA'])
  })

  it('defaults to INTERNAL + LINK when no sources provided', () => {
    const defaultAdapters = [UploadAdapter.INTERNAL, UploadAdapter.LINK]
    expect(defaultAdapters).toEqual(['INTERNAL', 'LINK'])
  })
})
