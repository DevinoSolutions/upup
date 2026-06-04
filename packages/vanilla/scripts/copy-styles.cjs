const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'dist')
fs.mkdirSync(outDir, { recursive: true })
fs.copyFileSync(path.join(root, 'src', 'styles.css'), path.join(outDir, 'styles.css'))

