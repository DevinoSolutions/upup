// scripts/compose-vue.test.mjs
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copyDir } from './compose-vue.mjs'

let root
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'compose-')) })
afterEach(() => { rmSync(root, { recursive: true, force: true }) })

describe('copyDir', () => {
  it('recursively copies a directory tree', () => {
    const src = join(root, 'src')
    const dest = join(root, 'dest')
    mkdirSync(join(src, 'sub'), { recursive: true })
    writeFileSync(join(src, 'a.txt'), 'A')
    writeFileSync(join(src, 'sub', 'b.txt'), 'B')

    copyDir(src, dest)

    expect(existsSync(join(dest, 'a.txt'))).toBe(true)
    expect(readFileSync(join(dest, 'sub', 'b.txt'), 'utf8')).toBe('B')
  })

  it('throws a clear error when the source is missing', () => {
    expect(() => copyDir(join(root, 'nope'), join(root, 'dest')))
      .toThrow(/source not found/i)
  })
})
