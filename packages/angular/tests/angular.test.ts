import { describe, expect, it } from 'vitest'
import { FileSource } from '@upup/core'
import { upupAngularAttributes } from '../src/upup-angular-attributes'

describe('@upup/angular', () => {
  it('maps Angular inputs to Upup custom element attributes', () => {
    expect(
      upupAngularAttributes({
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
