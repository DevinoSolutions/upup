import { describe, it, expectTypeOf } from 'vitest'
import type { UpupThemeSlots } from '../slots'

describe('UpupThemeSlots', () => {
  it('has uploader slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('uploader')
  })

  it('uploader has root and container slots', () => {
    expectTypeOf<UpupThemeSlots['uploader']>().toHaveProperty('root')
    expectTypeOf<UpupThemeSlots['uploader']>().toHaveProperty('container')
  })

  it('has fileList slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('fileList')
  })

  it('has dropZone slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('dropZone')
  })

  it('has sourceSelector slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('sourceSelector')
  })

  it('has progressBar slots', () => {
    expectTypeOf<UpupThemeSlots>().toHaveProperty('progressBar')
  })
})
