# Adapter Migration & Type Safety — Design Spec

## Overview

Three workstreams to complete the cross-framework portability initiative:

1. **Type Safety** — Eliminate all `as never`/`as any` casts in `@upup/react` src (54 occurrences, 28 in useRootProvider alone)
2. **Adapter Migration** — Move all cloud adapter auth/API logic from React hooks into core plugins. React hooks become pure event subscribers. Enables Vue/Svelte/Solid adapters.
3. **Adapter Tests** — Full test coverage for the migrated adapter plugins and their React subscriber hooks.

---

## Workstream 1: Type Safety

### Problem

`useRootProvider.ts` has 28 `as never` casts at boundaries where core event payloads meet `UpupUploaderProps` callback signatures. These silence genuine type mismatches and hide breakage when core types evolve.

**Example:**
```ts
// Core emits: { file: UploadFile; result: { key?: string } }
// Prop expects: (file: UploadFile, key: string) => void
const unsubSuccess = core.on('upload-success', (payload: unknown) => {
    const { file, result } = payload as { file?: UploadFile; result?: { key?: string } }
    if (file) onFileUploadComplete(file as never, result?.key ?? file.key ?? '')
})
```

### Root Cause

1. Core `EventEmitter` is untyped — events emit `unknown` payloads, requiring manual casting at every subscription site.
2. `UpupUploaderProps` callback signatures were designed for DX (flat params) rather than matching core's event shapes (object payloads).

### Solution

**Phase A: Type the EventEmitter**

Add a `CoreEvents` type map to core:
```ts
type CoreEvents = {
    'state-change': void
    'upload-start': void
    'file-upload-start': { file: UploadFile }
    'upload-progress': { fileId: string; loaded: number; total: number }
    'upload-success': { file: UploadFile; result: { key?: string } }
    'upload-error': { error: UpupError; file?: UploadFile }
    'upload-all-complete': UploadFile[]
    'files-added': UploadFile[]
    'file-removed': UploadFile
    // ... all core events
}
```

Make `EventEmitter` generic: `EventEmitter<T extends Record<string, unknown>>`. The `.on(event, handler)` and `.emit(event, payload)` methods become type-safe.

**Phase B: Typed adapter at the boundary**

In `useRootProvider`, write explicit adapter functions instead of casts:
```ts
const unsubSuccess = core.on('upload-success', ({ file, result }) => {
    onFileUploadComplete(file, result?.key ?? file.key ?? '')
})
```

No `as never` needed because the event handler receives a properly typed payload.

**Phase C: Align remaining prop types**

Where props use slightly different shapes than core (e.g. `onFileRemove` vs `onFileRemoved`), create thin adapter functions at the wiring site. Each adapter is 1-3 lines and fully typed.

### Scope

- Modify: `packages/core/src/events.ts` (generic EventEmitter)
- Create: `packages/core/src/types/core-events.ts` (event type map)
- Modify: `packages/react/src/hooks/useRootProvider.ts` (remove all `as never`)
- Modify: `packages/react/src/shared/types.ts` (align callback signatures where trivial)
- Modify: `packages/react/src/prop-getters.ts`, component files (remaining `as any`)

---

## Workstream 2: Adapter Migration

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  @upup/core                                             │
│                                                         │
│  ┌───────────────────┐   ┌─────────────────────────┐   │
│  │  UpupCore          │   │  EventEmitter<CoreEvents>│  │
│  │  - pluginManager   │──▶│  - on(event, handler)    │  │
│  │  - use(plugin)     │   │  - emit(event, payload)  │  │
│  └───────────────────┘   └─────────────────────────┘   │
│           │                          ▲                   │
│           ▼                          │ emits             │
│  ┌───────────────────┐              │                   │
│  │  DropboxPlugin     │──────────────┘                   │
│  │  - authenticate()  │                                  │
│  │  - loadFiles(path) │                                  │
│  │  - downloadFiles() │                                  │
│  │  - signOut()       │                                  │
│  │  - refreshToken()  │                                  │
│  └───────────────────┘                                   │
│  (same for GoogleDrive, OneDrive, Box)                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  @upup/react (thin subscriber)                          │
│                                                         │
│  useDropbox()                                           │
│  - subscribes to dropbox:* events                       │
│  - maps events → useState                              │
│  - returns { files, authenticate, loadFiles, ... }     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  @upup/vue (future, same pattern)                       │
│                                                         │
│  useDropbox()                                           │
│  - subscribes to dropbox:* events                       │
│  - maps events → ref()                                 │
│  - returns { files, authenticate, loadFiles, ... }     │
└─────────────────────────────────────────────────────────┘
```

### Plugin State Machine (per adapter)

```
         ┌──────────────────────────────────┐
         │          UNINITIALIZED           │
         └────────────┬─────────────────────┘
                      │ init(emitter)
                      ▼
         ┌──────────────────────────────────┐
         │            IDLE                  │
         │  (configured, not authenticated) │
         └────────────┬─────────────────────┘
                      │ authenticate()
                      ▼
         ┌──────────────────────────────────┐
    ┌───▶│        AUTHENTICATING            │
    │    │  (popup open / polling)          │
    │    └──────┬──────────────┬────────────┘
    │           │ success      │ error
    │           ▼              ▼
    │    ┌─────────────┐  ┌──────────┐
    │    │AUTHENTICATED│  │  IDLE    │ (emits auth-error)
    │    │ (has token)  │  └──────────┘
    │    └──────┬───────┘
    │           │ loadFiles() / downloadFiles()
    │           ▼
    │    ┌──────────────────────────────────┐
    │    │          BROWSING                │
    │    │  (listing files, navigating)     │
    │    └──────┬──────────────┬────────────┘
    │           │ 401          │ signOut()
    │           ▼              ▼
    │    ┌─────────────┐  ┌──────────┐
    └────│SESSION_EXPIRED│  │  IDLE    │
         └─────────────┘  └──────────┘
```

### Event Contract

All adapter events are namespaced: `{adapter}:{event}`.

**Dropbox:**
| Event | Payload | When |
|---|---|---|
| `dropbox:auth-start` | `{}` | OAuth popup opened |
| `dropbox:auth-success` | `{ userName?: string }` | Token obtained |
| `dropbox:auth-error` | `{ error: Error }` | Auth failed |
| `dropbox:popup-blocked` | `{}` | Browser blocked popup |
| `dropbox:session-expired` | `{}` | Token refresh failed |
| `dropbox:files-loading` | `{ path: string }` | File list request started |
| `dropbox:files-loaded` | `{ files: DriveFile[], path: string, cursor?: string }` | File list received |
| `dropbox:files-error` | `{ error: Error }` | File list failed |
| `dropbox:download-start` | `{ files: DriveFile[] }` | File download started |
| `dropbox:download-complete` | `{ files: File[] }` | Files ready for upload |
| `dropbox:download-error` | `{ error: Error, file?: DriveFile }` | Download failed |
| `dropbox:signed-out` | `{}` | User signed out |

**Same pattern for `gdrive:*`, `onedrive:*`, `box:*`** with provider-specific nuances (OneDrive uses MSAL, Google uses gapi picker).

### Shared Types

```ts
// packages/core/src/adapters/types.ts
export type DriveFile = {
    id: string
    name: string
    path: string
    size: number
    mimeType: string
    isFolder: boolean
    thumbnail?: string
    modifiedAt?: string
}

export type AdapterState = 'idle' | 'authenticating' | 'authenticated' | 'browsing' | 'session-expired'
```

### Plugin Implementation (Dropbox example)

```ts
// packages/core/src/adapters/dropbox-plugin.ts
export class DropboxPlugin implements AdapterPlugin {
    readonly id = 'dropbox'
    readonly name = 'dropbox'
    private emitter: EventEmitter | null = null
    private config: DropboxConfigs = {}
    private accessToken: string | null = null
    private refreshToken: string | null = null

    configure(config: DropboxConfigs): this { ... }
    
    init(emitter: EventEmitter): void {
        this.emitter = emitter
        this.restoreSession()  // check sessionStorage
    }

    async authenticate(): Promise<void> {
        this.emitter!.emit('dropbox:auth-start', {})
        
        const popup = window.open(this.buildAuthUrl(), '_blank', 'width=600,height=700')
        if (!popup) {
            this.emitter!.emit('dropbox:popup-blocked', {})
            return
        }

        try {
            const code = await this.pollPopupForCode(popup)
            const tokens = await this.exchangeCode(code)
            this.accessToken = tokens.access_token
            this.refreshToken = tokens.refresh_token
            this.persistSession()
            this.emitter!.emit('dropbox:auth-success', { userName: tokens.account_id })
        } catch (error) {
            this.emitter!.emit('dropbox:auth-error', { error: error as Error })
        }
    }

    async loadFiles(path = ''): Promise<void> {
        this.emitter!.emit('dropbox:files-loading', { path })
        
        try {
            const token = await this.ensureValidToken()
            const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: path || '', limit: 100 }),
            })
            
            if (response.status === 401) {
                this.emitter!.emit('dropbox:session-expired', {})
                return
            }
            
            const data = await response.json()
            const files = this.mapEntries(data.entries)
            this.emitter!.emit('dropbox:files-loaded', { files, path, cursor: data.cursor })
        } catch (error) {
            this.emitter!.emit('dropbox:files-error', { error: error as Error })
        }
    }

    async downloadFiles(files: DriveFile[]): Promise<void> {
        this.emitter!.emit('dropbox:download-start', { files })
        
        try {
            const token = await this.ensureValidToken()
            const downloaded: File[] = await Promise.all(
                files.map(f => this.downloadSingle(f, token))
            )
            this.emitter!.emit('dropbox:download-complete', { files: downloaded })
        } catch (error) {
            this.emitter!.emit('dropbox:download-error', { error: error as Error })
        }
    }

    signOut(): void {
        this.accessToken = null
        this.refreshToken = null
        this.clearSession()
        this.emitter!.emit('dropbox:signed-out', {})
    }

    destroy(): void {
        this.emitter = null
        this.accessToken = null
        this.refreshToken = null
    }

    // Private: token refresh, popup polling, URL building, session storage
    private async ensureValidToken(): Promise<string> { ... }
    private async exchangeCode(code: string): Promise<TokenResponse> { ... }
    private pollPopupForCode(popup: Window): Promise<string> { ... }
    private buildAuthUrl(): string { ... }
    private persistSession(): void { sessionStorage.setItem(...) }
    private restoreSession(): void { ... }
    private clearSession(): void { sessionStorage.removeItem(...) }
    private mapEntries(entries: unknown[]): DriveFile[] { ... }
    private async downloadSingle(file: DriveFile, token: string): Promise<File> { ... }
}
```

### React Hook (thin subscriber)

```ts
// packages/react/src/hooks/useDropbox.ts
export function useDropbox() {
    const { core } = useUploaderRuntime()
    const plugin = core?.getPlugin('dropbox') as DropboxPlugin | undefined
    
    const [state, setState] = useState<AdapterState>('idle')
    const [files, setFiles] = useState<DriveFile[]>([])
    const [path, setPath] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [userName, setUserName] = useState<string | null>(null)

    useEffect(() => {
        if (!core) return
        const subs = [
            core.on('dropbox:auth-start', () => setState('authenticating')),
            core.on('dropbox:auth-success', ({ userName: u }) => { setState('authenticated'); setUserName(u ?? null) }),
            core.on('dropbox:auth-error', ({ error: e }) => { setState('idle'); setError(e.message) }),
            core.on('dropbox:popup-blocked', () => { setState('idle'); setError('Popup blocked') }),
            core.on('dropbox:session-expired', () => { setState('session-expired'); setError('Session expired') }),
            core.on('dropbox:files-loading', () => setState('browsing')),
            core.on('dropbox:files-loaded', ({ files: f, path: p }) => { setFiles(f); setPath(p); setError(null) }),
            core.on('dropbox:files-error', ({ error: e }) => setError(e.message)),
            core.on('dropbox:download-complete', ({ files: downloaded }) => {
                core.addFiles(downloaded)
            }),
            core.on('dropbox:signed-out', () => { setState('idle'); setFiles([]); setUserName(null) }),
        ]
        return () => subs.forEach(u => u())
    }, [core])

    return {
        state, files, path, error, userName,
        isAuthenticated: state === 'authenticated' || state === 'browsing',
        authenticate: () => plugin?.authenticate(),
        loadFiles: (p?: string) => plugin?.loadFiles(p),
        selectFiles: (files: DriveFile[]) => plugin?.downloadFiles(files),
        navigateToFolder: (folder: DriveFile) => plugin?.loadFiles(folder.path),
        signOut: () => plugin?.signOut(),
    }
}
```

### Files Deleted After Migration

The following React hook files are fully replaced by the single `useDropbox.ts` subscriber + `DropboxPlugin` in core:
- `packages/react/src/hooks/useDropboxAuth.ts` (278 lines) → deleted
- `packages/react/src/hooks/useDropboxUploader.ts` (341 lines) → deleted  
- `packages/react/src/hooks/dropbox-types.ts` (30 lines) → replaced by shared `DriveFile` type

Same pattern per adapter:
- `useGoogleDriveUploader.ts` (185 lines) → deleted
- `useOneDriveAuth.ts` (251 lines) → deleted
- `useOneDriveUploader.ts` (253 lines) → deleted
- `useBoxAuth.ts` (156 lines) → deleted
- `useBoxUploader.ts` (122 lines) → deleted

**Total: ~1600 lines of React code deleted**, replaced by ~800 lines of framework-agnostic plugin code in core + ~200 lines of subscriber hooks.

### Provider-Specific Notes

**Google Drive:**
- Uses `gapi.client` for file listing and Google Picker API for native file selection UI
- Plugin loads gapi script dynamically via script tag injection
- Picker popup is a Google-hosted iframe — plugin opens it, listens for selection callback

**OneDrive:**
- Uses MSAL.js (`@azure/msal-browser`) for auth
- Plugin dynamically imports MSAL, creates `PublicClientApplication`
- Uses Microsoft Graph API for file listing
- File download via Graph `/content` endpoint

**Box:**
- Uses OAuth2 with PKCE (popup flow)
- REST API for file listing and download
- No external SDK needed — pure fetch

### Bundle Size Mitigation

Adapters should be tree-shakeable. If a consumer doesn't import `DropboxPlugin`, it shouldn't be in their bundle.

Strategy:
- Each plugin is a separate file in core (`adapters/dropbox-plugin.ts`, etc.)
- They're exported as named exports (not star-exported from a barrel)
- Registration happens in the React layer only when `cloudDrives` config is provided
- Dynamic import option: `const { DropboxPlugin } = await import('@upup/core/adapters/dropbox')`

If bundle analysis shows all adapters are included regardless, extract to `@upup/adapters` package (deferred — optimize when measured).

---

## Workstream 3: Adapter Tests

### Strategy

Tests are written in two layers:

**Layer 1: Plugin unit tests (in `packages/core/tests/`)**
- Mock `fetch` globally
- Mock `window.open` for popup flows  
- Mock `sessionStorage` for token persistence
- Test the full state machine: idle → authenticating → authenticated → browsing → signed out
- Test error paths: network failure, 401, popup blocked, timeout
- Test token refresh flow

**Layer 2: React hook tests (in `packages/react/tests/`)**
- Use `renderHook` with a mock `UpupCore` that has a real `EventEmitter`
- Emit events manually, assert hook state updates
- Test that hook actions call plugin methods
- No need to test auth logic (covered by Layer 1)

### Coverage Targets

| Component | Test file | Focus |
|---|---|---|
| `DropboxPlugin` | `core/tests/dropbox-plugin.test.ts` | Full auth flow, file listing, download, token refresh, error handling |
| `GoogleDrivePlugin` | `core/tests/google-drive-plugin.test.ts` | gapi load, picker integration, file listing, download |
| `OneDrivePlugin` | `core/tests/onedrive-plugin.test.ts` | MSAL init, silent/popup auth, Graph API calls |
| `BoxPlugin` | `core/tests/box-plugin.test.ts` | PKCE flow, file listing, download |
| `useDropbox` | `react/tests/use-dropbox.test.ts` | Event subscription, state mapping, action delegation |
| `useGoogleDrive` | `react/tests/use-google-drive.test.ts` | Same pattern |
| `useOneDrive` | `react/tests/use-onedrive.test.ts` | Same pattern |
| `useBox` | `react/tests/use-box.test.ts` | Same pattern |

---

## Execution Order

```
Workstream 1 (Type Safety)          Workstream 2 (Adapter Migration)
─────────────────────────           ────────────────────────────────
1A. Type EventEmitter           ──▶ 2A. Define CoreEvents + AdapterEvents maps
1B. Type useRootProvider subs       2B. Shared DriveFile type + AdapterState
1C. Remove all `as never`           2C. DropboxPlugin full implementation
                                    2D. GoogleDrivePlugin full implementation
                                    2E. OneDrivePlugin full implementation
                                    2F. BoxPlugin full implementation
                                    2G. Thin React hooks (replace 8 files with 4)
                                    2H. Wire into useRootProvider
                                    2I. Delete old hook files + // v2: comments

                                    Workstream 3 (Tests)
                                    ────────────────────
                                    3A. Plugin unit tests (4 files)
                                    3B. React hook tests (4 files)
```

**Dependencies:**
- 1A must complete before 2A (typed emitter needed for typed events)
- 2C-2F can run in parallel
- 3A can start as soon as each plugin is done (doesn't need React hooks)
- 3B requires 2G (tests the new hook API)

---

## Success Criteria

1. Zero `as never` or `as any` casts in `packages/react/src/` (production code, tests excluded)
2. All `// v2:` comments removed
3. Each cloud adapter works end-to-end: auth → browse → select → upload
4. React hook API surface is 1 hook per adapter (4 total, down from 12)
5. Plugin tests achieve >90% branch coverage on auth + file operations
6. `pnpm run build:package` succeeds with no size regression >5%
7. A Vue/Svelte adapter can be built by subscribing to the same events (no core changes needed)

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| OAuth regression during migration | Users can't auth to cloud drives | Write plugin tests first, validate against real APIs in playground before deleting old code |
| Bundle size increase | Larger downloads for consumers | Tree-shake verification, consider `@upup/adapters` package if needed |
| MSAL/gapi SDK loading failures | OneDrive/Google Drive broken in CSP-strict environments | Fallback error events, document CSP requirements |
| Token persistence across tabs | Race conditions on refresh | Use sessionStorage (tab-scoped), not localStorage |
| Popup blockers | Auth fails silently | Explicit `popup-blocked` event, UI can show "allow popups" message |
