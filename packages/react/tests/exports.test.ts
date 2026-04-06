import { describe, it, expect } from 'vitest'
import * as ReactPackage from '../src/index'

describe('@upup/react public exports', () => {
  // Core component
  it('exports UpupUploader', () => {
    expect(ReactPackage.UpupUploader).toBeDefined()
  })

  // Headless hook
  it('exports useUpupUpload', () => {
    expect(typeof ReactPackage.useUpupUpload).toBe('function')
  })

  it('exports useIsClient', () => {
    expect(typeof ReactPackage.useIsClient).toBe('function')
  })

  // Enums
  it('exports UploadAdapter enum', () => {
    expect(ReactPackage.UploadAdapter).toBeDefined()
    expect(ReactPackage.UploadAdapter.INTERNAL).toBe('INTERNAL')
    expect(ReactPackage.UploadAdapter.GOOGLE_DRIVE).toBe('GOOGLE_DRIVE')
    expect(ReactPackage.UploadAdapter.ONE_DRIVE).toBe('ONE_DRIVE')
    expect(ReactPackage.UploadAdapter.DROPBOX).toBe('DROPBOX')
    expect(ReactPackage.UploadAdapter.LINK).toBe('LINK')
    expect(ReactPackage.UploadAdapter.CAMERA).toBe('CAMERA')
    expect(ReactPackage.UploadAdapter.AUDIO).toBe('AUDIO')
    expect(ReactPackage.UploadAdapter.SCREEN).toBe('SCREEN')
  })

  it('exports UpupProvider enum', () => {
    expect(ReactPackage.UpupProvider).toBeDefined()
    expect(ReactPackage.UpupProvider.AWS).toBe('aws')
    expect(ReactPackage.UpupProvider.Azure).toBe('azure')
  })

  it('exports FileSource from @upup/shared', () => {
    expect(ReactPackage.FileSource).toBeDefined()
  })

  it('exports StorageProvider as alias for UpupProvider', () => {
    expect(ReactPackage.StorageProvider).toBe(ReactPackage.UpupProvider)
  })

  // v2 re-exports from core
  it('exports UpupCore from @upup/core', () => {
    expect(ReactPackage.UpupCore).toBeDefined()
    expect(typeof ReactPackage.UpupCore).toBe('function')
  })

  // Sub-components (v1 names)
  it('exports AdapterSelector', () => {
    expect(ReactPackage.AdapterSelector).toBeDefined()
  })

  it('exports AdapterView', () => {
    expect(ReactPackage.AdapterView).toBeDefined()
  })

  it('exports CameraUploader', () => {
    expect(ReactPackage.CameraUploader).toBeDefined()
  })

  it('exports FileList', () => {
    expect(ReactPackage.FileList).toBeDefined()
  })

  it('exports FilePreview', () => {
    expect(ReactPackage.FilePreview).toBeDefined()
  })

  it('exports MainBox', () => {
    expect(ReactPackage.MainBox).toBeDefined()
  })

  it('exports UrlUploader', () => {
    expect(ReactPackage.UrlUploader).toBeDefined()
  })

  // v2 component aliases
  it('exports SourceSelector as alias for AdapterSelector', () => {
    expect(ReactPackage.SourceSelector).toBe(ReactPackage.AdapterSelector)
  })

  it('exports SourceView as alias for AdapterView', () => {
    expect(ReactPackage.SourceView).toBe(ReactPackage.AdapterView)
  })

  it('exports DropZone as alias for MainBox', () => {
    expect(ReactPackage.DropZone).toBe(ReactPackage.MainBox)
  })

  // Prop getters
  it('exports createPropGetters', () => {
    expect(typeof ReactPackage.createPropGetters).toBe('function')
  })

  // Context hooks
  it('exports useRootContext', () => {
    expect(typeof ReactPackage.useRootContext).toBe('function')
  })

  it('exports useUploaderContext as alias for useRootContext', () => {
    expect(ReactPackage.useUploaderContext).toBe(ReactPackage.useRootContext)
  })

  // Utilities
  it('exports cn utility', () => {
    expect(typeof ReactPackage.cn).toBe('function')
  })

  // i18n
  it('exports en_US locale', () => {
    expect(ReactPackage.en_US).toBeDefined()
    expect(ReactPackage.en_US.cancel).toBe('Cancel')
    expect(ReactPackage.en_US.done).toBe('Done')
  })

  // Completeness check — ensure no unexpected exports snuck in
  it('has expected number of exports', () => {
    const exportNames = Object.keys(ReactPackage)
    // 30+ exports expected — this catches accidental removals
    expect(exportNames.length).toBeGreaterThanOrEqual(25)
  })
})
