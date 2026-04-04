# Uppy vs UploadThing: Monorepo & Package Architecture Comparison

## Summary Table

| Dimension | Uppy | UploadThing |
|---|---|---|
| **Repository** | [transloadit/uppy](https://github.com/transloadit/uppy) | [pingdotgg/uploadthing](https://github.com/pingdotgg/uploadthing) |
| **Package manager** | Yarn workspaces | pnpm workspaces |
| **Scope** | `@uppy/*` | `@uploadthing/*` + `uploadthing` |
| **Published npm packages** | ~30+ scoped packages | ~10 packages |
| **Design philosophy** | Plugin-based, maximally modular, open-source, self-hosted | Service-oriented, framework-first, managed cloud |
| **Cloud provider model** | Separate package per provider (each a plugin) | No client-side provider adapters -- storage is server-managed |
| **UI model** | 3 tiers: Dashboard (composed), headless components, hooks | Pre-built UploadButton + UploadDropzone per framework |
| **Core/logic split** | `@uppy/core` (state machine) + `@uppy/utils` (shared helpers) | `uploadthing` (core, framework-agnostic) + `@uploadthing/shared` (internal utils) |
| **Framework bindings** | Separate packages: `@uppy/react`, `@uppy/vue`, `@uppy/svelte`, `@uppy/angular` | Separate packages: `@uploadthing/react`, `@uploadthing/vue`, `@uploadthing/svelte`, `@uploadthing/solid`, `@uploadthing/nuxt`, `@uploadthing/expo` |
| **Backend adapters** | `@uppy/companion` (standalone Node server) | Built into core `uploadthing` package; adapters for Express, Fastify, H3/Nuxt |
| **View engine** | Preact (internal rendering) | Native framework components (React/Vue/Svelte/Solid) |
| **License** | MIT (open source) | MIT (open source client, managed cloud backend) |

---

## 1. Uppy: Detailed Package Architecture

### Repository: `transloadit/uppy` (monorepo, Yarn workspaces)

All packages live under `packages/@uppy/<name>` and are published as `@uppy/<name>`.

### Package Categories

#### Core
| Package | Purpose |
|---|---|
| `@uppy/core` | State machine, plugin registry, event bus, file management |
| `@uppy/utils` | Shared utilities used by core and all plugins |
| `@uppy/store-default` | Default simple object store |
| `@uppy/store-redux` | Redux integration store |
| `@uppy/companion-client` | Client-side SDK for talking to Companion server |

#### Meta Package
| Package | Purpose |
|---|---|
| `uppy` | Convenience meta-package bundling all official plugins (requires tree-shaking) |

#### UI Plugins (Pre-composed)
| Package | Purpose |
|---|---|
| `@uppy/dashboard` | Full-featured upload UI (file list, progress, previews, camera, providers) |
| `@uppy/drag-drop` | Simple drag-and-drop area *(deprecated in v5)* |
| `@uppy/file-input` | Simple file input button *(deprecated in v5)* |
| `@uppy/progress-bar` | Thin progress bar *(deprecated in v5, merged into Dashboard)* |
| `@uppy/status-bar` | Upload status/progress bar *(merged into Dashboard in v5)* |
| `@uppy/informer` | Toast notifications *(merged into Dashboard in v5)* |
| `@uppy/image-editor` | Crop, rotate, zoom images before upload |
| `@uppy/thumbnail-generator` | Generate image previews/thumbnails |
| `@uppy/provider-views` | Shared UI for browsing remote provider files |

#### Remote Source / Cloud Provider Plugins (each a separate package)
| Package | Source |
|---|---|
| `@uppy/box` | Box |
| `@uppy/dropbox` | Dropbox |
| `@uppy/facebook` | Facebook |
| `@uppy/google-drive` | Google Drive |
| `@uppy/google-drive-picker` | Google Drive (Picker API) |
| `@uppy/google-photos-picker` | Google Photos (Picker API) |
| `@uppy/instagram` | Instagram |
| `@uppy/onedrive` | OneDrive |
| `@uppy/unsplash` | Unsplash |
| `@uppy/url` | Import from any URL |
| `@uppy/zoom` | Zoom recordings |
| `@uppy/remote-sources` | Convenience plugin that bundles all remote sources |

#### Upload Destination Plugins
| Package | Destination |
|---|---|
| `@uppy/tus` | Resumable uploads via tus protocol |
| `@uppy/xhr-upload` | Classic XHR/fetch uploads to any backend |
| `@uppy/aws-s3` | Direct upload to S3 (includes multipart) |
| `@uppy/transloadit` | Transloadit encoding service (uses tus internally) |

#### Input / Capture Plugins
| Package | Purpose |
|---|---|
| `@uppy/webcam` | Camera capture |
| `@uppy/audio` | Audio recording |
| `@uppy/screen-capture` | Screen recording |
| `@uppy/drop-target` | Make any DOM element a drop target |

#### Misc Plugins
| Package | Purpose |
|---|---|
| `@uppy/compressor` | Client-side image compression (JPEG/PNG/WEBP, ~60% savings) |
| `@uppy/form` | Connect Uppy to an HTML `<form>` |
| `@uppy/golden-retriever` | Restore files after browser crash (IndexedDB + Service Worker) |
| `@uppy/locales` | All locale/translation packs |

#### Framework Bindings
| Package | Framework |
|---|---|
| `@uppy/react` | React wrappers for all UI plugins + hooks |
| `@uppy/vue` | Vue 3 components |
| `@uppy/svelte` | Svelte components |
| `@uppy/angular` | Angular 14+ components |

#### Server
| Package | Purpose |
|---|---|
| `@uppy/companion` | Standalone Node.js server -- proxies OAuth & streams files from remote providers to upload destinations |

### Total: ~30+ published npm packages

### Headless vs UI Approach (Uppy 5.0)

Uppy 5.0 introduced a 3-tier UI model:
1. **Pre-composed (Dashboard)**: Full kitchen-sink UI, plug-and-play
2. **Headless components**: Smaller building blocks with data-attribute-driven styling, composable
3. **Hooks**: Zero UI -- attach Uppy logic to your own custom components

---

## 2. UploadThing: Detailed Package Architecture

### Repository: `pingdotgg/uploadthing` (monorepo, pnpm workspaces)

Packages live under `packages/<name>`.

### Package Categories

#### Core
| Package (npm) | Purpose |
|---|---|
| `uploadthing` | Core library -- FileRouter definition, server utilities, client SDK (framework-agnostic) |
| `@uploadthing/shared` | Internal shared utilities, types, helpers |
| `@uploadthing/mime-types` | Edge-compatible MIME type detection (fork of mime-types) |

#### Framework UI Bindings (each provides UploadButton + UploadDropzone components)
| Package (npm) | Framework |
|---|---|
| `@uploadthing/react` | React (includes hooks: `useUploadThing`, `useDropzone`) |
| `@uploadthing/vue` | Vue 3 |
| `@uploadthing/svelte` | Svelte / SvelteKit |
| `@uploadthing/solid` | Solid.js / SolidStart |
| `@uploadthing/nuxt` | Nuxt (wraps `@uploadthing/vue` + H3 adapter) |
| `@uploadthing/expo` | React Native / Expo |

#### Tooling
| Package (npm) | Purpose |
|---|---|
| `@uploadthing/mcp-server` | MCP server for AI integrations |

#### Backend Adapters (built into core `uploadthing` package)
- Next.js App Router / Pages Router (built-in)
- Express adapter
- Fastify adapter
- H3 adapter (powers Nuxt, SolidStart, etc.)

### Total: ~10 published npm packages

### Headless vs UI Approach

UploadThing provides:
1. **Pre-built components**: `UploadButton` and `UploadDropzone` in each framework package
2. **Hooks**: `useUploadThing()` hook for building custom UI
3. No separate "headless component" tier -- you either use the built-in components or use the hook directly

---

## 3. Key Architectural Differences

### Cloud Provider Adapters
| Aspect | Uppy | UploadThing |
|---|---|---|
| Model | **Separate npm package per provider** (Box, Dropbox, Google Drive, etc.) | **No client-side provider adapters** -- uploads go to UploadThing's managed storage |
| Server | `@uppy/companion` standalone server handles OAuth + streaming | Backend is UploadThing's hosted API; you define a FileRouter on your server |
| Storage targets | S3, Tus server, XHR endpoint, Transloadit | UploadThing's managed storage (S3 under the hood, abstracted away) |

### Core Logic vs UI Split
| Aspect | Uppy | UploadThing |
|---|---|---|
| Core | `@uppy/core` is a standalone state machine (~40KB) | `uploadthing` core is both server + client SDK |
| Plugins | Everything is a plugin registered with core | No plugin system -- server-side FileRouter + client hooks |
| State | Central Uppy store with events | React/framework state via hooks |

### Framework Bindings
| Aspect | Uppy | UploadThing |
|---|---|---|
| Approach | Thin wrappers that mount Uppy plugins into framework components | Native framework components with built-in upload logic |
| Rendering | Preact-based shadow rendering inside framework wrappers | Native framework rendering (React JSX, Vue SFC, etc.) |
| Frameworks | React, Vue, Svelte, Angular (4 frameworks) | React, Vue, Svelte, Solid, Nuxt, Expo (6 targets) |

### Design Philosophy
| Aspect | Uppy | UploadThing |
|---|---|---|
| Philosophy | **DIY toolkit** -- combine plugins to build any upload workflow | **Managed service** -- define what, UploadThing handles how |
| Pricing | Free & open source; Companion self-hosted; optional Transloadit SaaS | Free tier + paid plans for storage/bandwidth |
| Complexity | High flexibility, more setup required | Low setup, less customization |
| Target user | Developers needing full control over upload infrastructure | Developers wanting fast integration with managed storage |

---

## Sources

- [Uppy GitHub Repository](https://github.com/transloadit/uppy)
- [Uppy Documentation](https://uppy.io/docs/)
- [Uppy 5.0 Announcement (headless components)](https://uppy.io/blog/uppy-5.0/)
- [Uppy Comparison Page](https://uppy.io/docs/comparison/)
- [Uppy Issue #862: Splitting into multiple packages](https://github.com/transloadit/uppy/issues/862)
- [UploadThing GitHub Repository](https://github.com/pingdotgg/uploadthing)
- [UploadThing Documentation](https://docs.uploadthing.com/)
- [UploadThing npm](https://www.npmjs.com/package/uploadthing)
- [@uploadthing/react npm](https://www.npmjs.com/package/@uploadthing/react)
- [@uploadthing/shared npm](https://www.npmjs.com/package/@uploadthing/shared)
- [@uploadthing/vue npm](https://www.npmjs.com/package/@uploadthing/vue)
- [@uploadthing/nuxt npm](https://www.npmjs.com/package/@uploadthing/nuxt)
- [@uploadthing/expo npm](https://www.npmjs.com/package/@uploadthing/expo)
- [@uploadthing/mcp-server npm](https://www.npmjs.com/package/@uploadthing/mcp-server)
- [@uppy/core npm](https://www.npmjs.com/package/@uppy/core)
- [@uppy/aws-s3 npm](https://www.npmjs.com/package/@uppy/aws-s3)
- [UploadThing Express Adapter Docs](https://docs.uploadthing.com/backend-adapters/express)
- [UploadThing Fastify Adapter Docs](https://docs.uploadthing.com/backend-adapters/fastify)
- [UploadThing H3 Adapter Docs](https://docs.uploadthing.com/backend-adapters/h3)
