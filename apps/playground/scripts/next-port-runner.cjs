const { spawn } = require('child_process')

const mode = process.argv[2]

if (!mode || !['dev', 'start'].includes(mode)) {
    console.error(
        'Usage: node ./scripts/next-port-runner.cjs <dev|start>',
    )
    process.exit(1)
}

const port = process.env.PLAYGROUND_PORT || '53004'
const nextBin = require.resolve('next/dist/bin/next')
const args = [nextBin, mode, '-p', port]

const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
})

process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))

child.on('exit', code => process.exit(code ?? 0))
