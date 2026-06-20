import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { readTarballEntries, collectExportTargets } from './tarball.mjs'

function tarHeader(name, size) {
  const h = Buffer.alloc(512)
  h.write(name, 0, 'utf8')
  h.write('0000644\0', 100)
  h.write('0000000\0', 108)
  h.write('0000000\0', 116)
  h.write(size.toString(8).padStart(11, '0') + '\0', 124)
  h.write('00000000000\0', 136)
  h.write('        ', 148) // checksum placeholder (8 spaces)
  h.write('0', 156) // typeflag '0' = regular file
  h.write('ustar\0', 257)
  h.write('00', 263)
  let sum = 0
  for (let i = 0; i < 512; i++) sum += h[i]
  h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148)
  return h
}

function makeTgz(files) {
  const blocks = []
  for (const { name, content } of files) {
    const data = Buffer.from(content, 'utf8')
    blocks.push(tarHeader(name, data.length))
    const pad = Buffer.alloc(Math.ceil(data.length / 512) * 512)
    data.copy(pad)
    blocks.push(pad)
  }
  blocks.push(Buffer.alloc(1024)) // two zero blocks = end of archive
  return gzipSync(Buffer.concat(blocks))
}

test('readTarballEntries extracts members with correct content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tarball-test-'))
  const tgz = join(dir, 'pkg.tgz')
  writeFileSync(tgz, makeTgz([
    { name: 'package/package.json', content: '{"name":"@x/y","dependencies":{"z":"workspace:*"}}' },
    { name: 'package/dist/index.js', content: 'export const a = 1\n' },
  ]))
  const entries = readTarballEntries(tgz)
  assert.equal(entries.has('package/package.json'), true)
  assert.equal(entries.has('package/dist/index.js'), true)
  const pkg = JSON.parse(entries.get('package/package.json').toString('utf8'))
  assert.equal(pkg.name, '@x/y')
  assert.match(entries.get('package/package.json').toString('utf8'), /workspace:/)
  assert.match(entries.get('package/dist/index.js').toString('utf8'), /export const a/)
})

test('collectExportTargets flattens nested exports to relative targets', () => {
  const targets = collectExportTargets({
    '.': { types: './dist/index.d.ts', import: './dist/index.js', require: './dist/index.cjs' },
    './styles': './dist/tailwind-prefixed.css',
  })
  assert.deepEqual(new Set(targets), new Set([
    'dist/index.d.ts', 'dist/index.js', 'dist/index.cjs', 'dist/tailwind-prefixed.css',
  ]))
})
