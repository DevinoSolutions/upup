import { describe, it, expect } from 'vitest'
import * as ReactPackage from '../src/index'

describe('@upup/react public exports', () => {
  it('exports the React uploader and headless hook', () => {
    expect(ReactPackage.UpupUploader).toBeDefined()
    expect(typeof ReactPackage.useUpupUpload).toBe('function')
    expect(typeof ReactPackage.useIsClient).toBe('function')
  })

  it('exports canonical source and provider enums from @upup/core', () => {
    expect(ReactPackage.FileSource.LOCAL).toBe('local')
    expect(ReactPackage.FileSource.GOOGLE_DRIVE).toBe('googleDrive')
    expect(ReactPackage.StorageProvider.AWS).toBe('aws')
    expect(ReactPackage.StorageProvider.Azure).toBe('azure')
  })

  it('does not export v1/internal component surface from the main entry', () => {
    expect((ReactPackage as any).UpupCore).toBeUndefined()
    expect((ReactPackage as any).SourceSelector).toBeUndefined()
    expect((ReactPackage as any).SourceView).toBeUndefined()
    expect((ReactPackage as any).CameraUploader).toBeUndefined()
    expect((ReactPackage as any).FileList).toBeUndefined()
    expect((ReactPackage as any).FilePreview).toBeUndefined()
    expect((ReactPackage as any).UploaderPanel).toBeUndefined()
    expect((ReactPackage as any).UrlUploader).toBeUndefined()
    expect((ReactPackage as any).createPropGetters).toBeUndefined()
  })

  it('exports the headless context hooks (parity with @upup/vue and @upup/svelte)', () => {
    for (const hook of [
      'useUploaderContext',
      'useUploaderRuntime',
      'useUploaderSource',
      'useUploaderI18n',
      'useUploaderFiles',
      'useUploaderUploadControls',
      'useUploaderView',
      'useUploaderEditor',
      'useUploaderOptions',
      'useUploaderTheme',
    ] as const) {
      expect(typeof (ReactPackage as Record<string, unknown>)[hook], hook).toBe(
        'function',
      )
    }
  })

  it('keeps utilities that are intentionally public', () => {
    expect(ReactPackage.UpupThemeProvider).toBeDefined()
    expect(ReactPackage.ACCEPT_PRESETS).toBeDefined()
  })
})
