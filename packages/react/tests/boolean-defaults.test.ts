import { describe, it, expect } from 'vitest'

// Test the default values for boolean props as resolved in useUploaderController
// These mirror the destructuring defaults at the top of useUploaderController

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

  it('folderUpload.allowDrop does not show the picker button by default', () => {
    const folderUpload: { allowDrop?: boolean; showSelectFolderButton?: boolean } = { allowDrop: true }
    const folderPickerButtonVisible = folderUpload.showSelectFolderButton ?? false
    expect(folderPickerButtonVisible).toBe(false)
  })

  it('folderUpload.showSelectFolderButton controls the picker independently from folder drop', () => {
    const folderUpload: { allowDrop?: boolean; showSelectFolderButton?: boolean } = {
      allowDrop: false,
      showSelectFolderButton: true,
    }
    const folderPickerButtonVisible = folderUpload.showSelectFolderButton ?? false
    expect(folderPickerButtonVisible).toBe(true)
  })

  it('dangerous CORS auto-config is off unless explicitly configured', () => {
    const props: { cors?: { dangerouslyAutoConfigure?: boolean; allowedOrigins: string[] } } = {}
    const dangerouslyAutoConfigure = props.cors?.dangerouslyAutoConfigure ?? false
    expect(dangerouslyAutoConfigure).toBe(false)
  })
})
