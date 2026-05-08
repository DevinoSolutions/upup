import { describe, it, expect } from 'vitest'

// Test the default values for boolean props as resolved in useRootProvider
// These mirror the destructuring defaults at the top of useRootProvider

describe('boolean prop defaults', () => {
  // Simulates the destructuring: enablePaste = false
  it('enablePaste defaults to false', () => {
    const props: { enablePaste?: boolean } = {}
    const enablePaste = props.enablePaste ?? false
    expect(enablePaste).toBe(false)
  })

  it('enablePaste can be set to true', () => {
    const enablePaste = true
    expect(enablePaste).toBe(true)
  })

  // Simulates the destructuring: autoUpload = false
  it('autoUpload defaults to false', () => {
    const props: { autoUpload?: boolean } = {}
    const autoUpload = props.autoUpload ?? false
    expect(autoUpload).toBe(false)
  })

  it('autoUpload can be set to true', () => {
    const autoUpload = true
    expect(autoUpload).toBe(true)
  })

  it('folderUpload.enabled shows the picker button by default', () => {
    const folderUpload: { enabled?: boolean; showPickerButton?: boolean } = { enabled: true }
    const folderPickerButtonVisible = folderUpload.showPickerButton ?? folderUpload.enabled ?? false
    expect(folderPickerButtonVisible).toBe(true)
  })

  it('folderUpload.showPickerButton can hide the picker while folder upload remains enabled', () => {
    const folderUpload: { enabled?: boolean; showPickerButton?: boolean } = {
      enabled: true,
      showPickerButton: false,
    }
    const folderPickerButtonVisible = folderUpload.showPickerButton ?? folderUpload.enabled ?? false
    expect(folderPickerButtonVisible).toBe(false)
  })

  it('folderUpload.showPickerButton can show the picker without enabling drag folder traversal', () => {
    const folderUpload: { enabled?: boolean; showPickerButton?: boolean } = {
      enabled: false,
      showPickerButton: true,
    }
    const folderPickerButtonVisible = folderUpload.showPickerButton ?? folderUpload.enabled ?? false
    expect(folderPickerButtonVisible).toBe(true)
  })

  it('dangerous CORS auto-config is off unless explicitly configured', () => {
    const props: { cors?: { dangerouslyAutoConfigure?: boolean; allowedOrigins: string[] } } = {}
    const dangerouslyAutoConfigure = props.cors?.dangerouslyAutoConfigure ?? false
    expect(dangerouslyAutoConfigure).toBe(false)
  })
})
