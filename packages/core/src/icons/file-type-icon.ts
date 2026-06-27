import { ICONS, type IconName } from './registry'

/** Resolve a file extension to its registry glyph name, or the generic 'file'. */
export function fileTypeIconName(extension: string): IconName {
  const key = `file-${(extension ?? '').toLowerCase()}`
  return (key in ICONS ? key : 'file') as IconName
}
