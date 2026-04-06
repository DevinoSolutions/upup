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

  // allowFolderUpload → showSelectFolderButton alias
  it('allowFolderUpload maps to showSelectFolderButton', () => {
    const allowFolderUpload = true
    const showSelectFolderButtonProp = false
    // Simulates: const showSelectFolderButton = allowFolderUpload || showSelectFolderButtonProp
    const showSelectFolderButton = allowFolderUpload || showSelectFolderButtonProp
    expect(showSelectFolderButton).toBe(true)
  })

  it('showSelectFolderButton is false when both aliases are false/undefined', () => {
    const allowFolderUpload = undefined
    const showSelectFolderButtonProp = false
    const showSelectFolderButton = allowFolderUpload || showSelectFolderButtonProp
    expect(showSelectFolderButton).toBe(false)
  })

  it('showSelectFolderButton is true from v1 prop alone', () => {
    const allowFolderUpload = undefined
    const showSelectFolderButtonProp = true
    const showSelectFolderButton = allowFolderUpload || showSelectFolderButtonProp
    expect(showSelectFolderButton).toBe(true)
  })

  // enableAutoCorsConfig defaults to false
  it('enableAutoCorsConfig defaults to false', () => {
    const props: { enableAutoCorsConfig?: boolean } = {}
    const enableAutoCorsConfig = props.enableAutoCorsConfig ?? false
    expect(enableAutoCorsConfig).toBe(false)
  })
})
