import type { IconType } from 'react-icons'
import {
    SiReact,
    SiVuedotjs,
    SiSvelte,
    SiAngular,
    SiJavascript,
    SiPreact,
} from 'react-icons/si'

// ─────────────────────────────────────────────────────────────────────────────
// The ONE source of truth for every framework upup ships a native UI package
// for. The home page (framework strip), the per-framework marketing pages
// (/react, /vue, …), and the code-snippet tabs all render from this enum — so a
// framework's name, npm package, icon, docs link, and demo capabilities are
// declared exactly once. Adding a framework is one entry here.
//
// The live demo on every page is React-powered (@upupjs/react) by design; these
// pages are marketing/SEO surfaces branded per framework, not per-framework
// runtimes. `hasImageEditor` gates the image editor to React/Preact only — it
// ships the real Filerobot editor as a lazily-loaded real-React island and the
// other frameworks intentionally stub it (see CLAUDE.md "deliberate decisions").
// ─────────────────────────────────────────────────────────────────────────────

export type FrameworkId =
    'react' | 'vue' | 'svelte' | 'angular' | 'vanilla' | 'preact'

export interface FrameworkMeta {
    id: FrameworkId
    /** Display name, e.g. "Vue". */
    name: string
    /** Published npm package, e.g. "@upupjs/vue". */
    pkg: string
    /** Example file name for the snippet, e.g. "Uploader.vue". */
    file: string
    /** Minimal, verified client-mode snippet from the package README. */
    code: string
    /** The image editor is a real-React island — React/Preact only. */
    hasImageEditor: boolean
    /** Docs quickstart path under /documentation. */
    docsQuickstart: string
    /** Framework-specific hero sub-line. */
    tagline: string
    /** Official brand logo (react-icons/si). */
    Icon: IconType
    /** Official brand color (hex) for the icon. */
    brand: string
}

const REACT_CODE = `'use client'
import { UpupUploader } from '@upupjs/react'
import '@upupjs/react/styles'

export default function Uploader() {
  return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}`

const VUE_CODE = `<script setup lang="ts">
import { UpupUploader } from '@upupjs/vue'
import '@upupjs/vue/styles'
</script>

<template>
  <UpupUploader provider="aws" upload-endpoint="/api/upload-token" />
</template>`

const SVELTE_CODE = `<script lang="ts">
  import { UpupUploader } from '@upupjs/svelte'
  import '@upupjs/svelte/styles'
</script>

<UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />`

const ANGULAR_CODE = `import { Component } from '@angular/core'
import { UpupUploaderComponent } from '@upupjs/angular'
// Load styles once: add '@upupjs/angular/styles' to angular.json → "styles"

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [UpupUploaderComponent],
  template: \`<upup-uploader
    [config]="{ provider: 'aws', uploadEndpoint: '/api/upload-token' }"
  />\`,
})
export class AppComponent {}`

const VANILLA_CODE = `import { createUploader } from '@upupjs/vanilla'
import '@upupjs/vanilla/styles'

createUploader('#uploader', {
  provider: 'aws',
  uploadEndpoint: '/api/upload-token',
})`

const PREACT_CODE = `import { UpupUploader } from '@upupjs/preact'
import '@upupjs/preact/styles'

export function App() {
  return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}`

export const FRAMEWORKS: Record<FrameworkId, FrameworkMeta> = {
    react: {
        id: 'react',
        name: 'React',
        pkg: '@upupjs/react',
        file: 'Uploader.tsx',
        code: REACT_CODE,
        hasImageEditor: true,
        docsQuickstart: '/documentation/quickstarts/react',
        tagline:
            'A headless-core React file uploader with drag & drop, cloud drives, an image editor, and secure server-mode uploads.',
        Icon: SiReact,
        brand: '#61DAFB',
    },
    vue: {
        id: 'vue',
        name: 'Vue',
        pkg: '@upupjs/vue',
        file: 'Uploader.vue',
        code: VUE_CODE,
        hasImageEditor: false,
        docsQuickstart: '/documentation/quickstarts/vue',
        tagline:
            'A native Vue file uploader — the same headless core and UI as React, drag & drop, cloud drives, and secure server-mode uploads.',
        Icon: SiVuedotjs,
        brand: '#42B883',
    },
    svelte: {
        id: 'svelte',
        name: 'Svelte',
        pkg: '@upupjs/svelte',
        file: 'Uploader.svelte',
        code: SVELTE_CODE,
        hasImageEditor: false,
        docsQuickstart: '/documentation/quickstarts/svelte',
        tagline:
            'A native Svelte file uploader — the same headless core and UI as React, drag & drop, cloud drives, and secure server-mode uploads.',
        Icon: SiSvelte,
        brand: '#FF3E00',
    },
    angular: {
        id: 'angular',
        name: 'Angular',
        pkg: '@upupjs/angular',
        file: 'app.component.ts',
        code: ANGULAR_CODE,
        hasImageEditor: false,
        docsQuickstart: '/documentation/quickstarts/angular',
        tagline:
            'A native Angular file uploader — the same headless core and UI as React, drag & drop, cloud drives, and secure server-mode uploads.',
        Icon: SiAngular,
        brand: '#DD0031',
    },
    vanilla: {
        id: 'vanilla',
        name: 'Vanilla JS',
        pkg: '@upupjs/vanilla',
        file: 'uploader.ts',
        code: VANILLA_CODE,
        hasImageEditor: false,
        docsQuickstart: '/documentation/quickstarts/vanilla',
        tagline:
            'A framework-free file uploader for plain JavaScript & TypeScript — drag & drop, cloud drives, and secure server-mode uploads.',
        Icon: SiJavascript,
        brand: '#F7DF1E',
    },
    preact: {
        id: 'preact',
        name: 'Preact',
        pkg: '@upupjs/preact',
        file: 'App.tsx',
        code: PREACT_CODE,
        hasImageEditor: true,
        docsQuickstart: '/documentation/quickstarts/preact',
        tagline:
            'A Preact file uploader (React-compatible) with drag & drop, cloud drives, an image editor, and secure server-mode uploads.',
        Icon: SiPreact,
        brand: '#673AB8',
    },
}

/** Frameworks in display order (React first — the visual canon). */
export const FRAMEWORK_LIST: FrameworkMeta[] = [
    FRAMEWORKS.react,
    FRAMEWORKS.vue,
    FRAMEWORKS.svelte,
    FRAMEWORKS.angular,
    FRAMEWORKS.vanilla,
    FRAMEWORKS.preact,
]

export const FRAMEWORK_IDS: FrameworkId[] = FRAMEWORK_LIST.map(f => f.id)

export function getFramework(id: string): FrameworkMeta | undefined {
    return (FRAMEWORKS as Record<string, FrameworkMeta>)[id]
}
