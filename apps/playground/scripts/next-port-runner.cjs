const fs = require('fs')
const net = require('net')
const path = require('path')
const { spawn } = require('child_process')

const mode = process.argv[2]

if (!mode || !['dev', 'start'].includes(mode)) {
    console.error('Usage: node ./scripts/next-port-runner.cjs <dev|start>')
    process.exit(1)
}

const port = Number(process.env.PLAYGROUND_PORT || '53004')
const nextBin = require.resolve('next/dist/bin/next')
const args = [nextBin, mode, '-p', String(port)]

const lockPath = path.resolve(__dirname, '..', '.next', 'dev', 'lock')

function portIsInUse(p) {
    return new Promise((resolve) => {
        const tester = net
            .createServer()
            .once('error', () => resolve(true))
            .once('listening', () => tester.close(() => resolve(false)))
            .listen(p, '127.0.0.1')
    })
}

async function clearStaleLock() {
    // Next.js leaves .next/dev/lock behind when dev is force-killed (common on
    // Windows Ctrl+C). The next start then errors with "Unable to acquire lock"
    // even though nothing is running. Only clear the lock if the port is free;
    // if something IS on the port, respect the lock and let Next print its own
    // error so we never corrupt a live dev server.
    if (mode !== 'dev') return
    if (!fs.existsSync(lockPath)) return
    const inUse = await portIsInUse(port)
    if (inUse) return
    try {
        fs.rmSync(lockPath, { force: true })
        console.log(`[next-port-runner] removed stale lock at ${lockPath}`)
    } catch (err) {
        console.warn(`[next-port-runner] failed to remove stale lock: ${err.message}`)
    }
}

clearStaleLock().then(() => {
    const child = spawn(process.execPath, args, {
        stdio: 'inherit',
        env: process.env,
    })

    process.on('SIGINT', () => child.kill('SIGINT'))
    process.on('SIGTERM', () => child.kill('SIGTERM'))

    child.on('exit', (code) => process.exit(code ?? 0))
})
