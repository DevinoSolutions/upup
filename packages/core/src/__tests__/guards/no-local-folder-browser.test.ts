import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// vitest cwd is packages/core → packages/ is one up.
const PACKAGES_DIR = resolve(process.cwd(), '..')
// This guard file necessarily names the symbol; exclude it from its own scan.
const SELF = fileURLToPath(import.meta.url)

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|vue|svelte|js)$/.test(entry)) out.push(full)
  }
  return out
}

describe('LocalFolderBrowser is fully removed', () => {
  it('has no references in any package src/', () => {
    const hits: string[] = []
    for (const pkg of readdirSync(PACKAGES_DIR)) {
      const srcDir = join(PACKAGES_DIR, pkg, 'src')
      try {
        statSync(srcDir)
      } catch {
        continue
      }
      for (const file of walk(srcDir)) {
        if (file === SELF) continue
        if (readFileSync(file, 'utf8').includes('LocalFolderBrowser')) hits.push(file)
      }
    }
    expect(hits, `unexpected LocalFolderBrowser references:\n${hits.join('\n')}`).toEqual([])
  }, 30_000)
})
