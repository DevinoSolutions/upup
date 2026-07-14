import { rmSync } from 'node:fs'
// Single pre-build clean so neither tsup config wipes the other's output.
rmSync('./dist', { recursive: true, force: true })
