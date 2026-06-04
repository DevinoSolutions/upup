const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'dist')
fs.mkdirSync(outDir, { recursive: true })
fs.copyFileSync(path.resolve(root, '..', 'vanilla', 'dist', 'styles.css'), path.join(outDir, 'styles.css'))

