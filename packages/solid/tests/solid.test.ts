import { describe, expect, it } from 'vitest'
import { FileSource } from '@upup/core'
import { upupSolidAttributes } from '../src/attrs'

describe('@upup/solid', () => {
  it('maps Solid props to Upup custom element attributes', () => {
    expect(
      upupSolidAttributes({
        uploadEndpoint: '/upload',
        sources: [FileSource.LOCAL, FileSource.URL],
        maxFiles: 2,
        enablePaste: true,
        theme: 'dark',
      }),
    ).toMatchObject({
      'upload-endpoint': '/upload',
      sources: 'local,url',
      'max-files': 2,
      'enable-paste': '',
      theme: 'dark',
    })
  })
})
