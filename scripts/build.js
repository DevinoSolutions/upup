const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const distDir = path.join(__dirname, '../dist')
const tempDir = path.join(__dirname, '../dist-temp')

// Delete temp directory if it already exists
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true })

// Run browser build
execSync('pnpm run build:browser', { stdio: 'inherit' })

// Save browser build
fs.mkdirSync(tempDir)
fs.cpSync(distDir, tempDir, { recursive: true })

// Run node build
execSync('pnpm run build:node', { stdio: 'inherit' })

// Merge builds
fs.cpSync(tempDir, distDir, { recursive: true })
fs.rmSync(tempDir, { recursive: true })
