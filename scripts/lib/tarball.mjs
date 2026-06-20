import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

/**
 * Read every member of a gzipped tarball (.tgz) into a Map of name -> Buffer.
 * Pure Node (zlib + ustar parsing) — works on Windows without a `tar` binary,
 * unlike `tar -xOf` (Windows bsdtar can't extract a single member to stdout).
 *
 * Scope: flat ustar regular-file entries as produced by `npm pack`/`pnpm pack`.
 * Long-path names (pax extended headers, GNU `@LongLink`, or the ustar `prefix`
 * field) are not reassembled; such entries are skipped or keyed by their
 * truncated name.
 */
export function readTarballEntries(tarballPath) {
  const buf = gunzipSync(readFileSync(tarballPath))
  const entries = new Map()
  let offset = 0
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512)
    const name = header.toString('utf8', 0, 100).replace(/\0.*$/, '')
    if (name === '') break // zero block => end of archive
    const sizeField = header.toString('utf8', 124, 136).replace(/[\0 ]/g, '')
    const size = parseInt(sizeField, 8) || 0
    const typeFlag = String.fromCharCode(header[156])
    const dataStart = offset + 512
    if (typeFlag === '0' || typeFlag === '\0') {
      entries.set(name, buf.subarray(dataStart, dataStart + size))
    }
    offset = dataStart + Math.ceil(size / 512) * 512
  }
  return entries
}

/**
 * Flatten a package.json `exports` field to the relative file targets it points at.
 * Note: glob subpath patterns (e.g. `./*`) are returned literally, not expanded —
 * callers that assert each target exists should use only static export targets.
 */
export function collectExportTargets(exportsField) {
  const targets = []
  const visit = (node) => {
    if (typeof node === 'string') {
      if (node.startsWith('./')) targets.push(node.slice(2))
    } else if (node && typeof node === 'object') {
      for (const value of Object.values(node)) visit(value)
    }
  }
  visit(exportsField)
  return targets
}
