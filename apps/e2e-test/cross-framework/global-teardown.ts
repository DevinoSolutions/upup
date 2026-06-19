import { readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..', '..', '..')
const STATE_FILE = join(tmpdir(), 'upup-e2e-cf-state.json')

export default async function globalTeardown() {
  if (!existsSync(STATE_FILE)) return
  const { harnessPid, dockerStartedByUs } = JSON.parse(
    readFileSync(STATE_FILE, 'utf8'),
  ) as { harnessPid?: number; dockerStartedByUs?: boolean }

  if (harnessPid) {
    try {
      process.kill(harnessPid)
      console.log(`[cf-teardown] harness pid ${harnessPid} stopped`)
    } catch {
      // already gone
    }
  }

  if (dockerStartedByUs) {
    await new Promise<void>((resolve) => {
      const child = spawn('docker', ['compose', 'down'], {
        cwd: REPO_ROOT,
        env: process.env,
        stdio: 'inherit',
        shell: true,
      })
      child.on('exit', () => resolve())
      child.on('error', () => resolve())
    })
    console.log('[cf-teardown] docker compose down (we started it)')
  } else {
    console.log('[cf-teardown] left MinIO running (pre-existing — not managed)')
  }

  rmSync(STATE_FILE, { force: true })
}
