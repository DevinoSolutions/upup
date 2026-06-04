import { FileSource, type CoreOptions } from '@upup/core'

export interface UpupAngularAttributeProps {
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
}

function sourcesAttr(sources: UpupAngularAttributeProps['sources']) {
  return Array.isArray(sources) ? sources.join(',') : sources
}

export function upupAngularAttributes(props: UpupAngularAttributeProps) {
  return {
    'upload-endpoint': props.uploadEndpoint,
    'server-url': props.serverUrl,
    mode: props.mode,
    sources: sourcesAttr(props.sources),
    'max-files': props.maxFiles,
    accept: props.accept,
    'enable-paste': props.enablePaste ? '' : undefined,
    theme: props.theme,
    locale: props.locale,
    dir: props.dir,
  }
}
