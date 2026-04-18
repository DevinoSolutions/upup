import { describe, it, expect } from 'vitest'
import { flattenSlotsToClassNames } from '../slots'

describe('flattenSlotsToClassNames', () => {
  it('returns {} when given undefined', () => {
    expect(flattenSlotsToClassNames(undefined)).toEqual({})
  })

  it('returns {} when given an empty object', () => {
    expect(flattenSlotsToClassNames({})).toEqual({})
  })

  it('maps fileList.uploadButton to flat key uploadButton', () => {
    const out = flattenSlotsToClassNames({
      fileList: { uploadButton: 'my-upload-btn' },
    })
    expect(out.uploadButton).toBe('my-upload-btn')
  })

  it('maps filePreview.deleteButton to flat key fileDeleteButton', () => {
    const out = flattenSlotsToClassNames({
      filePreview: { deleteButton: 'my-delete' },
    })
    expect(out.fileDeleteButton).toBe('my-delete')
  })

  it('maps progressBar.fill to flat key progressBarInner', () => {
    const out = flattenSlotsToClassNames({
      progressBar: { fill: 'my-fill' },
    })
    expect(out.progressBarInner).toBe('my-fill')
  })

  it('fans mini/multi-variant slots to both flat keys', () => {
    const out = flattenSlotsToClassNames({
      filePreview: { root: 'my-file-root' },
    })
    expect(out.fileItemSingle).toBe('my-file-root')
    expect(out.fileItemMultiple).toBe('my-file-root')
  })

  it('handles the fileList.body mini/multi variant split', () => {
    const out = flattenSlotsToClassNames({
      fileList: { body: 'my-body' },
    })
    expect(out.fileListContainerInnerSingle).toBe('my-body')
    expect(out.fileListContainerInnerMultiple).toBe('my-body')
  })

  it('covers new v2 slots added for v1 coverage gaps', () => {
    const out = flattenSlotsToClassNames({
      filePreview: { icon: 'my-icon' },
      fileList: { addMoreButton: 'my-add-more' },
      driveBrowser: {
        itemInner: 'my-drive-inner',
        searchContainer: 'my-search-wrap',
      },
    })
    expect(out.fileIcon).toBe('my-icon')
    expect(out.containerAddMoreButton).toBe('my-add-more')
    expect(out.driveItemContainerInner).toBe('my-drive-inner')
    expect(out.driveSearchContainer).toBe('my-search-wrap')
  })

  it('concatenates when two slot paths collapse onto the same flat key', () => {
    const out = flattenSlotsToClassNames({
      uploader: { root: 'cls-a', container: 'cls-b' },
    })
    // both `uploader.root` and `uploader.container` map to `containerFull`;
    // later entries append rather than overwrite.
    expect(out.containerFull).toContain('cls-a')
    expect(out.containerFull).toContain('cls-b')
  })

  it('ignores empty strings and non-strings', () => {
    const out = flattenSlotsToClassNames({
      fileList: { uploadButton: '' },
      filePreview: { name: 'keep-me' },
    })
    expect(out.uploadButton).toBeUndefined()
    expect(out.fileName).toBe('keep-me')
  })

  it('maps driveBrowser slots end-to-end', () => {
    const out = flattenSlotsToClassNames({
      driveBrowser: {
        header: 'h',
        searchInput: 's',
        body: 'b',
        footer: 'f',
        itemDefault: 'id',
        itemSelected: 'is',
        itemInnerText: 'iit',
        addFilesButton: 'afb',
        cancelFilesButton: 'cfb',
        logoutButton: 'lo',
        loading: 'ld',
      },
    })
    expect(out.driveHeader).toBe('h')
    expect(out.driveSearchInput).toBe('s')
    expect(out.driveBody).toBe('b')
    expect(out.driveFooter).toBe('f')
    expect(out.driveItemContainerDefault).toBe('id')
    expect(out.driveItemContainerSelected).toBe('is')
    expect(out.driveItemInnerText).toBe('iit')
    expect(out.driveAddFilesButton).toBe('afb')
    expect(out.driveCancelFilesButton).toBe('cfb')
    expect(out.driveLogoutButton).toBe('lo')
    expect(out.driveLoading).toBe('ld')
  })

  it('maps sourceView slots to adapterView flat keys', () => {
    const out = flattenSlotsToClassNames({
      sourceView: {
        root: 'v-root',
        header: 'v-head',
        cancelButton: 'v-cancel',
      },
    })
    expect(out.adapterView).toBe('v-root')
    expect(out.adapterViewHeader).toBe('v-head')
    expect(out.adapterViewCancelButton).toBe('v-cancel')
  })
})
