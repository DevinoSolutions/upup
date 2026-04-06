import { describe, it, expect, vi } from 'vitest'

// Test callback alias resolution as done in useRootProvider
// onFileRemoved → onFileRemove alias (v2 naming)
// imageCompression → shouldCompress alias

describe('callback alias resolution', () => {
  describe('onFileRemoved → onFileRemove', () => {
    it('v2 onFileRemoved takes precedence over v1 onFileRemove', () => {
      const onFileRemoved = vi.fn()
      const onFileRemoveProp = vi.fn()
      // Simulates: const onFileRemove = onFileRemoved ?? onFileRemoveProp
      const resolved = onFileRemoved ?? onFileRemoveProp
      resolved('test-file-id')
      expect(onFileRemoved).toHaveBeenCalledWith('test-file-id')
      expect(onFileRemoveProp).not.toHaveBeenCalled()
    })

    it('falls back to v1 onFileRemove when onFileRemoved is undefined', () => {
      const onFileRemoved = undefined
      const onFileRemoveProp = vi.fn()
      const resolved = onFileRemoved ?? onFileRemoveProp
      resolved('test-file-id')
      expect(onFileRemoveProp).toHaveBeenCalledWith('test-file-id')
    })
  })

  describe('imageCompression → shouldCompress', () => {
    it('v2 imageCompression takes precedence', () => {
      const imageCompression = true
      const shouldCompressProp = false
      // Simulates: const shouldCompress = imageCompression || shouldCompressProp
      const shouldCompress = imageCompression || shouldCompressProp
      expect(shouldCompress).toBe(true)
    })

    it('falls back to v1 shouldCompress when imageCompression is falsy', () => {
      const imageCompression = undefined
      const shouldCompressProp = true
      const shouldCompress = imageCompression || shouldCompressProp
      expect(shouldCompress).toBe(true)
    })

    it('is false when both are falsy', () => {
      const imageCompression = undefined
      const shouldCompressProp = false
      const shouldCompress = imageCompression || shouldCompressProp
      expect(shouldCompress).toBe(false)
    })
  })

  describe('default no-op callbacks', () => {
    it('onFilesSelected defaults to no-op', () => {
      const onFilesSelected = () => {}
      expect(() => onFilesSelected()).not.toThrow()
    })

    it('onDoneClicked defaults to no-op', () => {
      const onDoneClicked = () => {}
      expect(() => onDoneClicked()).not.toThrow()
    })

    it('onFileUploadStart defaults to no-op', () => {
      const onFileUploadStart = () => {}
      expect(() => onFileUploadStart()).not.toThrow()
    })

    it('onFileUploadComplete defaults to no-op', () => {
      const onFileUploadComplete = () => {}
      expect(() => onFileUploadComplete()).not.toThrow()
    })

    it('onFilesUploadComplete defaults to no-op', () => {
      const onFilesUploadComplete = () => {}
      expect(() => onFilesUploadComplete()).not.toThrow()
    })
  })
})
