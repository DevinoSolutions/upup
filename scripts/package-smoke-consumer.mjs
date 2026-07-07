import { spawnSync } from 'node:child_process'
import { readTarballEntries, collectExportTargets } from './lib/tarball.mjs'
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs'
import {
    dirname,
    extname,
    isAbsolute,
    join,
    relative,
    resolve,
} from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const smokeRoot = join(repoRoot, '.tmp', 'pack-smoke')
const tarballDir = join(smokeRoot, 'tarballs')
const consumerDir = join(smokeRoot, 'consumer')
const pnpmExecPath = process.env.npm_execpath
const kib = 1024
// Re-based 450→500 KiB 2026-07-07: the P12/P19 i18n registry puts all nine
// locale bundles on core's mandatory path BY DESIGN (the string-locale API —
// `locale: 'fr-FR'` — resolves synchronously from LOCALE_REGISTRY), which
// grew the measured entry to 486.9 KiB against a budget set pre-registry
// (2026-05-10). ~13 KiB headroom absorbs one more locale (~5 KiB each);
// anything larger must be a deliberate re-base, not a bump-to-green.
// Whether locales belong on the mandatory path at all is deferred with F-701.
const consumerEntryChunkBudget = 500 * kib
const consumerOptionalChunkBudget = 1600 * kib

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
    const normalized = packageName.replace('@', '').replace('/', '-')
    const match = readdirSync(tarballDir)
        .filter(name => name.endsWith('.tgz'))
        .find(name => name.startsWith(`${normalized}-`))
    if (!match) {
        throw new Error(`Could not find packed tarball for ${packageName}`)
    }
    return join(tarballDir, match)
}

function assertPackedPackageHasNoWorkspaceDeps(tarballPath) {
    const entries = readTarballEntries(tarballPath)
    const pkgJson = entries.get('package/package.json')
    if (!pkgJson) {
        throw new Error(`Could not find package/package.json in ${tarballPath}`)
    }
    if (pkgJson.toString('utf8').includes('workspace:')) {
        throw new Error(
            `Packed package leaks workspace dependency protocol: ${tarballPath}`,
        )
    }
}

function assertExportsResolvable(tarballPath) {
    const entries = readTarballEntries(tarballPath)
    const pkgBytes = entries.get('package/package.json')
    if (!pkgBytes)
        throw new Error(`Could not find package/package.json in ${tarballPath}`)
    const pkg = JSON.parse(pkgBytes.toString('utf8'))
    if (!pkg.exports) return
    for (const target of collectExportTargets(pkg.exports)) {
        if (!entries.has(`package/${target}`)) {
            throw new Error(
                `${pkg.name}: exports target ./${target} is missing from the packed tarball`,
            )
        }
    }
}

function assertCorePackageDistShape() {
    const entries = readTarballEntries(tarballs.core)
    const distFiles = [...entries.keys()].filter(name =>
        name.startsWith('package/dist/'),
    )

    if (!entries.has('package/dist/pipeline-worker.js')) {
        throw new Error(
            'core tarball is missing dist/pipeline-worker.js (module worker entry)',
        )
    }
    if (distFiles.some(name => /pipeline-worker\.code/.test(name))) {
        throw new Error(
            'core tarball still ships pipeline-worker.code.* (inlined WASM not removed)',
        )
    }

    const maxBytes = 500 * kib
    for (const name of distFiles) {
        const size = entries.get(name).length
        if (size > maxBytes) {
            throw new Error(
                `core dist file ${name} is ${(size / kib).toFixed(0)} KiB (> ${maxBytes / kib} KiB) — WASM likely inlined`,
            )
        }
    }

    const idiomShipped = distFiles
        .filter(name => name.endsWith('.js'))
        .some(name => {
            const text = entries.get(name).toString('utf8')
            return (
                text.includes('new URL("./pipeline-worker.js"') &&
                text.includes('import.meta.url')
            )
        })
    if (!idiomShipped) {
        throw new Error(
            'core dist does not ship new URL("./pipeline-worker.js", import.meta.url) — worker idiom missing (check tsup target >= es2020)',
        )
    }
}

function assertFileSizeAtMost(filePath, limit, label) {
    const { size } = statSync(filePath)
    if (size > limit) {
        throw new Error(
            `${label} is ${(size / kib).toFixed(1)} KiB, above ${(limit / kib).toFixed(1)} KiB`,
        )
    }
}

function assertConsumerBundleShape() {
    const distDir = join(consumerDir, 'dist')
    const assetsDir = join(distDir, 'assets')
    const manifestPath = join(distDir, '.vite', 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const manifestText = JSON.stringify(manifest)
    if (manifestText.includes('@smithy') || manifestText.includes('@aws-sdk')) {
        throw new Error(
            'Consumer browser bundle unexpectedly includes server/AWS modules',
        )
    }

    const entries = Object.values(manifest).filter(entry => entry.isEntry)
    if (entries.length !== 1) {
        throw new Error(
            `Expected one consumer entry chunk, found ${entries.length}`,
        )
    }

    assertFileSizeAtMost(
        join(distDir, entries[0].file),
        consumerEntryChunkBudget,
        'Consumer entry chunk',
    )

    const assetNames = readdirSync(assetsDir).filter(name =>
        name.endsWith('.js'),
    )
    const requiredLazyChunks = [
        'AudioUploader',
        'BoxUploader',
        'CameraUploader',
        'DropboxUploader',
        'GoogleDriveUploader',
        'ImageEditorInline',
        'ImageEditorModal',
        'OneDriveUploader',
        'ScreenCaptureUploader',
    ]

    for (const chunkName of requiredLazyChunks) {
        if (!assetNames.some(name => name.includes(chunkName))) {
            throw new Error(
                `Expected package smoke build to emit lazy chunk containing ${chunkName}`,
            )
        }
    }

    if (!assetNames.some(name => /pipeline-worker/i.test(name))) {
        throw new Error(
            'Consumer build did not emit a separate pipeline-worker chunk (worker may be inlined into the entry)',
        )
    }

    for (const assetName of assetNames) {
        const assetPath = join(assetsDir, assetName)
        const assetText = readFileSync(assetPath, 'utf8')
        if (/^['"]use client['"];?/m.test(assetText)) {
            throw new Error(
                `Consumer bundle contains leaked use client directive: ${assetName}`,
            )
        }
        assertFileSizeAtMost(
            assetPath,
            consumerOptionalChunkBudget,
            `Consumer JS asset ${assetName}`,
        )
    }
}

assertInsideRepo(smokeRoot)
rmSync(smokeRoot, { recursive: true, force: true })
mkdirSync(tarballDir, { recursive: true })
mkdirSync(join(consumerDir, 'src'), { recursive: true })

runPnpm(['run', 'build:package'])

const allPackages = [
    '@upup/core',
    '@upup/server',
    '@upup/react',
    '@upup/vue',
    '@upup/svelte',
    '@upup/vanilla',
    '@upup/angular',
    '@upup/preact',
    '@upup/next',
]

for (const packageName of allPackages) {
    runPnpm(['--filter', packageName, 'pack', '--pack-destination', tarballDir])
}

const tarballs = {
    core: findTarball('@upup/core'),
    server: findTarball('@upup/server'),
    react: findTarball('@upup/react'),
}

for (const packageName of allPackages) {
    const tarball = findTarball(packageName)
    assertPackedPackageHasNoWorkspaceDeps(tarball)
    assertExportsResolvable(tarball)
}

assertCorePackageDistShape()

writeFileSync(
    join(consumerDir, '.npmrc'),
    [
        'link-workspace-packages=false',
        'prefer-workspace-packages=false',
        'auto-install-peers=true',
        '',
    ].join('\n'),
)

writeFileSync(
    join(consumerDir, 'package.json'),
    `${JSON.stringify(
        {
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
        },
        null,
        2,
    )}\n`,
)

writeFileSync(
    join(consumerDir, 'tsconfig.json'),
    `${JSON.stringify(
        {
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
        },
        null,
        2,
    )}\n`,
)

writeFileSync(
    join(consumerDir, 'index.html'),
    [
        '<!doctype html>',
        '<html lang="en">',
        '  <head><meta charset="UTF-8" /><title>Upup Package Smoke</title></head>',
        '  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>',
        '</html>',
        '',
    ].join('\n'),
)

writeFileSync(
    join(consumerDir, 'vite.config.ts'),
    `import { defineConfig } from 'vite'

export default defineConfig({
  worker: {
    // pipeline-worker.js uses {type:'module'} — must emit as ES module chunks
    // to avoid Vite 7 defaulting to iife (invalid with code-splitting)
    format: 'es',
  },
  build: {
    manifest: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\\\', '/')
          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
`,
)

writeFileSync(
    join(consumerDir, 'src', 'main.tsx'),
    `import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  FileSource,
  UpupUploader,
  type UploaderProps,
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

const core = new UpupCore({ limit: 2 })
const translator = createTranslator({ bundle: enUS, fallback: arSA })
const theme = resolveTheme({ mode: 'light' })
const vars = tokensToVars(theme.tokens)

const props: UploaderProps = {
  sources: [FileSource.LOCAL, FileSource.URL],
  uploadEndpoint: '/api/upup-mock/presign',
  i18n: { locale: enUS, fallbackLocale: arSA },
  theme: { mode: 'system' },
  onUploadComplete(files: UploadFile[]) {
    console.log(files.length, UploadStatus.SUCCESSFUL, translator('fileList.uploadFiles'))
  },
}

console.log(Boolean(core), Object.keys(vars).length)

function App() {
  return <UpupUploader {...props} />
}

createRoot(document.getElementById('root')!).render(<App />)
`,
)

writeFileSync(
    join(consumerDir, 'src', 'server-smoke.ts'),
    `import { StorageProvider } from '@upup/core'
import { createUpupHandler, InMemoryTokenStore, type UpupServerConfig } from '@upup/server'
import { createUpupNextHandler } from '@upup/server/next'

const tokenStore = new InMemoryTokenStore()

const serverConfig: UpupServerConfig = {
  storage: {
    type: StorageProvider.AWS,
    bucket: 'smoke',
    region: 'us-east-1',
  },
  uploadTokenSecret: 'package-smoke-dev-secret-0123456789',
  allowAnonymous: true,
  allowAnonymousUploads: true,
  tokenStore,
}

export const serverSmoke = {
  routeHandler: createUpupHandler(serverConfig),
  nextHandler: createUpupNextHandler(serverConfig),
}
`,
)

runPnpm(['--ignore-workspace', 'install', '--no-frozen-lockfile'], consumerDir)
runPnpm(['--ignore-workspace', 'run', 'typecheck'], consumerDir)
runPnpm(['--ignore-workspace', 'run', 'build'], consumerDir)
assertConsumerBundleShape()

const lockfile = join(consumerDir, 'pnpm-lock.yaml')
if (
    existsSync(lockfile) &&
    readFileSync(lockfile, 'utf8').includes('workspace:')
) {
    throw new Error(
        'Consumer lockfile unexpectedly contains workspace protocol',
    )
}

console.log(`Package smoke consumer passed: ${consumerDir}`)
