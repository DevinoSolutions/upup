import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_STORYBOOK_ORIGINS } from './framework-matrix'

const HERE = dirname(fileURLToPath(import.meta.url))
// cross-framework -> e2e-test -> apps -> repo root
const REPO_ROOT = join(HERE, '..', '..', '..')
const STATE_FILE = join(tmpdir(), 'upup-e2e-cf-state.json')

const HARNESS_PORT = Number(process.env.UPUP_E2E_SERVER_PORT ?? 53060)
// Fallback matches the repo's OWN MinIO (:9100, local-dev/.env.minio). Never
// default to :9000 — another project's MinIO may listen there, and an
// invocation without the dotenv wrapper would silently hit foreign storage
// (F-707 live incident). Sanctioned entrypoint: pnpm run e2e / e2e:minio:*.
const MINIO_ENDPOINT = process.env.UPUP_E2E_ENDPOINT ?? 'http://localhost:9100'

async function reachable(url: string): Promise<boolean> {
    try {
        const res = await fetch(url, { method: 'GET' })
        // health endpoints return 200; tolerate MinIO's 403/400 on non-health paths
        return res.ok || res.status === 403 || res.status === 400
    } catch {
        return false
    }
}

async function waitFor(url: string, label: string, timeoutMs: number) {
    const start = Date.now()
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (await reachable(url)) return
        if (Date.now() - start > timeoutMs) {
            throw new Error(
                `Timed out (${timeoutMs}ms) waiting for ${label} at ${url}`,
            )
        }
        await new Promise(r => setTimeout(r, 1000))
    }
}

function runToCompletion(cmd: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd: REPO_ROOT,
            env: process.env,
            stdio: 'inherit',
            shell: true,
        })
        child.on('exit', code =>
            code === 0
                ? resolve()
                : reject(
                      new Error(`${cmd} ${args.join(' ')} exited with ${code}`),
                  ),
        )
        child.on('error', reject)
    })
}

export default async function globalSetup() {
    const minioHealth = `${MINIO_ENDPOINT}/minio/health/live`
    let dockerStartedByUs = false

    // 1. MinIO — reuse if already reachable (do NOT manage its lifecycle).
    if (await reachable(minioHealth)) {
        console.log(
            `[cf-setup] MinIO already reachable at ${MINIO_ENDPOINT} — reusing (not managing)`,
        )
    } else {
        console.log('[cf-setup] MinIO not reachable — docker compose up -d')
        await runToCompletion('docker', ['compose', 'up', '-d'])
        dockerStartedByUs = true
        await waitFor(minioHealth, 'MinIO', 90_000)
    }

    // 2. Harness on :53060 with ALL six storybook origins allowed.
    console.log(`[cf-setup] starting presign harness on :${HARNESS_PORT}`)
    const harness = spawn('node', ['scripts/upup-e2e-server.mjs'], {
        cwd: REPO_ROOT,
        env: {
            ...process.env,
            UPUP_E2E_STORYBOOK_ORIGIN: ALL_STORYBOOK_ORIGINS,
        },
        stdio: 'inherit',
        detached: true,
    })
    harness.unref()

    writeFileSync(
        STATE_FILE,
        JSON.stringify({ harnessPid: harness.pid, dockerStartedByUs }),
    )

    // 3. Wait for the harness health endpoint.
    await waitFor(`http://localhost:${HARNESS_PORT}/healthz`, 'harness', 60_000)
    console.log('[cf-setup] infra ready (MinIO + harness)')
}
