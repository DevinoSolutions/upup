import { describe, expect, it } from 'vitest'
import { FileSource } from '@upup/core'
import { upupQwikAttributes } from '../src/attrs'

describe('@upup/qwik', () => {
  it('maps Qwik props to Upup custom element attributes', () => {
    expect(
      upupQwikAttributes({
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
