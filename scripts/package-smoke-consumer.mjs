import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const smokeRoot = join(repoRoot, '.tmp', 'pack-smoke')
const tarballDir = join(smokeRoot, 'tarballs')
const consumerDir = join(smokeRoot, 'consumer')
const pnpmExecPath = process.env.npm_execpath

function assertInsideRepo(target) {
  const rel = relative(repoRoot, resolve(target))
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Refusing to touch path outside repo: ${target}`)
  }
}

function run(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  })
  if (result.status !== 0) {
    const detail = result.error ? ` (${result.error.message})` : ''
    throw new Error(`Command failed: ${command} ${args.join(' ')}${detail}`)
  }
}

function runPnpm(args, cwd = repoRoot) {
  if (pnpmExecPath) {
    const ext = extname(pnpmExecPath).toLowerCase()
    if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
      run(process.execPath, [pnpmExecPath, ...args], cwd)
    } else {
      run(pnpmExecPath, args, cwd)
    }
    return
  }
  run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, cwd)
}

function toFileSpec(fromDir, filePath) {
  return `file:${relative(fromDir, filePath).replaceAll('\\', '/')}`
}

function findTarball(packageName) {
  const normalized = packageName
    .replace('@', '')
    .replace('/', '-')
  const match = readdirSync(tarballDir)
    .filter(name => name.endsWith('.tgz'))
    .find(name => name.startsWith(`${normalized}-`))
  if (!match) {
    throw new Error(`Could not find packed tarball for ${packageName}`)
  }
  return join(tarballDir, match)
}

function assertPackedPackageHasNoWorkspaceDeps(tarballPath) {
  const result = spawnSync('tar', ['-xOf', tarballPath, 'package/package.json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  })
  if (result.status !== 0) {
    throw new Error(`Could not inspect ${tarballPath}`)
  }
  if (result.stdout.includes('workspace:')) {
    throw new Error(`Packed package leaks workspace dependency protocol: ${tarballPath}`)
  }
}

assertInsideRepo(smokeRoot)
rmSync(smokeRoot, { recursive: true, force: true })
mkdirSync(tarballDir, { recursive: true })
mkdirSync(join(consumerDir, 'src'), { recursive: true })

runPnpm(['run', 'build:package'])

for (const packageName of ['@upup/core', '@upup/server', '@upup/react']) {
  runPnpm(['--filter', packageName, 'pack', '--pack-destination', tarballDir])
}

const tarballs = {
  core: findTarball('@upup/core'),
  server: findTarball('@upup/server'),
  react: findTarball('@upup/react'),
}

for (const tarball of Object.values(tarballs)) {
  assertPackedPackageHasNoWorkspaceDeps(tarball)
}

writeFileSync(join(consumerDir, '.npmrc'), [
  'link-workspace-packages=false',
  'prefer-workspace-packages=false',
  'auto-install-peers=true',
  '',
].join('\n'))

writeFileSync(join(consumerDir, 'package.json'), `${JSON.stringify({
  name: 'upup-package-smoke-consumer',
  private: true,
  type: 'module',
  scripts: {
    typecheck: 'tsc --noEmit',
    build: 'vite build',
  },
  dependencies: {
    '@upup/core': toFileSpec(consumerDir, tarballs.core),
    '@upup/server': toFileSpec(consumerDir, tarballs.server),
    '@upup/react': toFileSpec(consumerDir, tarballs.react),
    react: '^19.2.0',
    'react-dom': '^19.2.0',
  },
  devDependencies: {
    '@types/node': '^20.10.0',
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
    typescript: '^5.3.2',
    vite: '^7.0.0',
  },
  pnpm: {
    overrides: {
      '@upup/core': toFileSpec(consumerDir, tarballs.core),
    },
  },
}, null, 2)}\n`)

writeFileSync(join(consumerDir, 'tsconfig.json'), `${JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    useDefineForClassFields: true,
    lib: ['DOM', 'DOM.Iterable', 'ES2022'],
    allowJs: false,
    skipLibCheck: false,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    module: 'ESNext',
    moduleResolution: 'Bundler',
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: 'react-jsx',
    types: ['node', 'vite/client'],
  },
  include: ['src'],
}, null, 2)}\n`)

writeFileSync(join(consumerDir, 'index.html'), [
  '<!doctype html>',
  '<html lang="en">',
  '  <head><meta charset="UTF-8" /><title>Upup Package Smoke</title></head>',
  '  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>',
  '</html>',
  '',
].join('\n'))

writeFileSync(join(consumerDir, 'src', 'main.tsx'), `import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  FileSource,
  StorageProvider,
  UpupUploader,
  type UpupUploaderProps,
} from '@upup/react'
import '@upup/react/styles'
import {
  UploadStatus,
  UpupCore,
  createTranslator,
  enUS,
  type UploadFile,
} from '@upup/core'
import { arSA } from '@upup/core/i18n'
import { resolveTheme, tokensToVars } from '@upup/core/theme'
import { createHandler, InMemoryTokenStore, type UpupServerConfig } from '@upup/server'
import { createUpupHandler } from '@upup/server/next'

const core = new UpupCore({ restrictions: { maxNumberOfFiles: 2 } })
const translator = createTranslator({ bundle: enUS, fallback: arSA })
const theme = resolveTheme({ mode: 'light' })
const vars = tokensToVars(theme.tokens)
const tokenStore = new InMemoryTokenStore()

const serverConfig: UpupServerConfig = {
  storage: {
    type: StorageProvider.AWS,
    bucket: 'smoke',
    region: 'us-east-1',
  },
  tokenStore,
}

const routeHandler = createHandler(serverConfig)
const nextHandler = createUpupHandler(serverConfig)

const props: UpupUploaderProps = {
  sources: [FileSource.LOCAL, FileSource.URL],
  uploadEndpoint: '/api/upup-mock/presign',
  i18n: { locale: enUS, fallbackLocale: arSA },
  theme: { mode: 'system' },
  onUploadComplete(files: UploadFile[]) {
    console.log(files.length, UploadStatus.SUCCESSFUL, translator('fileList.uploadFiles'))
  },
}

console.log(Boolean(core), Boolean(routeHandler), Boolean(nextHandler.POST), Object.keys(vars).length)

function App() {
  return <UpupUploader {...props} />
}

createRoot(document.getElementById('root')!).render(<App />)
`)

runPnpm(['--ignore-workspace', 'install', '--no-frozen-lockfile'], consumerDir)
runPnpm(['--ignore-workspace', 'run', 'typecheck'], consumerDir)
runPnpm(['--ignore-workspace', 'run', 'build'], consumerDir)

const lockfile = join(consumerDir, 'pnpm-lock.yaml')
if (existsSync(lockfile) && readFileSync(lockfile, 'utf8').includes('workspace:')) {
  throw new Error('Consumer lockfile unexpectedly contains workspace protocol')
}

console.log(`Package smoke consumer passed: ${consumerDir}`)
