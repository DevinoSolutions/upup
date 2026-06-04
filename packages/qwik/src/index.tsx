import { component$, useVisibleTask$, type JSXNode } from '@builder.io/qwik'
import { FileSource, type CoreOptions } from '@upup/core'
import { defineUpupElement } from '@upup/vanilla'
import { upupQwikAttributes, type UpupQwikAttributeProps } from './attrs'

export { FileSource, StorageProvider, UploadStatus } from '@upup/core'
export type { CoreOptions, UploadFile } from '@upup/core'
export { upupQwikAttributes }
export type { UpupQwikAttributeProps }

export interface UpupUploaderProps extends UpupQwikAttributeProps {
  uploadEndpoint?: string
  serverUrl?: string
  mode?: CoreOptions['mode']
  sources?: FileSource[] | string
  maxFiles?: number
  accept?: string
  enablePaste?: boolean
  theme?: 'light' | 'dark'
  locale?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  children?: JSXNode
}

export const UpupUploader = component$((props: UpupUploaderProps) => {
  useVisibleTask$(() => {
    defineUpupElement()
  })

  return (
    <upup-uploader {...upupQwikAttributes(props)}>
      {props.children}
    </upup-uploader>
  )
})
