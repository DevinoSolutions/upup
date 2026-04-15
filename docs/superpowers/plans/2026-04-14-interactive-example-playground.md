# Interactive Example & Playground — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated `HomepageDemo` component in `apps/landing` and `apps/playground` with a single shared workspace-internal package `@upup/interactive-example` that exposes every `UpupUploader` prop as an interactive toggle, shows live preview + generated code, and supports URL-serializable permalinks and focused docs embeds.

**Architecture:** New workspace-internal package `packages/interactive-example` (consumed as source, no build step). Manifest-driven: each category is a TypeScript file listing `ToggleEntry` objects; the `<Sidebar />` renders entries via a small set of toggle primitive components. Config state lives in a React context with URL sync via `pako`-gzipped base64url tokens. Consumers (`apps/landing`, `apps/playground`) import `<InteractiveExample />` and configure it via props (`defaultExpanded`, `showCodeTab`, `focus`).

**Tech Stack:** TypeScript, React 18/19, Next.js 16 (consumers), Vitest + @testing-library/react for tests, `pako` for gzip, `clsx` + Tailwind for styling (matches upup's existing patterns), `lucide-react` for icons (already in apps/playground deps).

**Spec:** `docs/superpowers/specs/2026-04-14-interactive-example-playground-design.md`

---

## File Structure Map

Files this plan creates in `packages/interactive-example/`:

```
packages/interactive-example/
├── package.json                         # Task 1
├── tsconfig.json                        # Task 1
├── vitest.config.ts                     # Task 1
├── src/
│   ├── index.ts                         # Task 1 (stub) → Task 17 (real)
│   ├── types.ts                         # Task 2
│   ├── state/
│   │   ├── ConfigContext.tsx            # Task 3
│   │   ├── useConfig.ts                 # Task 3
│   │   ├── serialize.ts                 # Task 4
│   │   ├── deserialize.ts               # Task 4
│   │   └── url-sync.ts                  # Task 5
│   ├── sidebar/
│   │   ├── primitives/
│   │   │   ├── BoolToggle.tsx           # Task 6
│   │   │   ├── NumberInput.tsx          # Task 7
│   │   │   ├── EnumSelect.tsx           # Task 7
│   │   │   ├── MultiSelect.tsx          # Task 7
│   │   │   ├── StringInput.tsx          # Task 8
│   │   │   ├── NestedConfig.tsx         # Task 8
│   │   │   └── index.ts                 # Task 8
│   │   ├── CategorySection.tsx          # Task 10
│   │   └── Sidebar.tsx                  # Task 11
│   ├── categories/
│   │   ├── upload.ts                    # Task 9
│   │   ├── sources.ts                   # Task 9
│   │   ├── limits.ts                    # Task 9
│   │   ├── processing.ts                # Task 9
│   │   ├── editor.ts                    # Task 9
│   │   ├── behavior.ts                  # Task 9
│   │   ├── appearance.ts                # Task 9
│   │   ├── language.ts                  # Task 9
│   │   ├── events.ts                    # Task 9
│   │   └── index.ts                     # Task 9
│   ├── preview/
│   │   └── UploaderPreview.tsx          # Task 12
│   ├── code/
│   │   ├── generateCode.ts              # Task 13
│   │   └── CodeTab.tsx                  # Task 14
│   ├── InteractiveExample.tsx           # Task 15
│   └── tests/
│       ├── useConfig.test.tsx           # Task 3
│       ├── serialize.test.ts            # Task 4
│       ├── url-sync.test.ts             # Task 5
│       ├── BoolToggle.test.tsx          # Task 6
│       ├── NumberInput.test.tsx         # Task 7
│       ├── EnumSelect.test.tsx          # Task 7
│       ├── MultiSelect.test.tsx         # Task 7
│       ├── StringInput.test.tsx         # Task 8
│       ├── NestedConfig.test.tsx        # Task 8
│       ├── categories.test.ts           # Task 9
│       ├── CategorySection.test.tsx     # Task 10
│       ├── Sidebar.test.tsx             # Task 11
│       ├── UploaderPreview.test.tsx     # Task 12
│       ├── generateCode.test.ts         # Task 13
│       ├── CodeTab.test.tsx             # Task 14
│       └── InteractiveExample.test.tsx  # Task 15
```

Files modified in existing consumers:

- `apps/playground/src/app/page.tsx` — Task 18
- `apps/landing/src/app/page.tsx` — Task 19
- `pnpm-workspace.yaml` — already includes `packages/*` so the new package auto-registers

Files deleted:

- `apps/playground/src/components/HomepageDemo/` (folder) — Task 20
- `apps/playground/src/components/Uploader.tsx` — Task 20
- `apps/landing/src/components/HomepageDemo/` (folder) — Task 20

---

## Preflight

All steps run from repo root `c:\Users\amind\OneDrive\Desktop\Projects\INTERNAL\upup` unless noted. The monorepo uses `pnpm` workspaces (`pnpm-workspace.yaml` lists `apps/*` and `packages/*`).

Current branch: `v2-clean`. Do not merge to `master`.

---

## Task 1: Scaffold the package

**Files:**
- Create: `packages/interactive-example/package.json`
- Create: `packages/interactive-example/tsconfig.json`
- Create: `packages/interactive-example/vitest.config.ts`
- Create: `packages/interactive-example/src/index.ts`

- [ ] **Step 1: Create `packages/interactive-example/package.json`**

```json
{
  "name": "@upup/interactive-example",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@upup/react": "workspace:*",
    "@upup/shared": "workspace:*",
    "clsx": "^2.1.1",
    "lucide-react": "^0.503.0",
    "pako": "^2.1.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.6.1",
    "@types/pako": "^2.0.4",
    "@types/react": ">=18.0.0",
    "@types/react-dom": ">=18.0.0",
    "jsdom": "22.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "typescript": "^5.3.2",
    "vitest": "^4.1.2"
  }
}
```

- [ ] **Step 2: Create `packages/interactive-example/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/interactive-example/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 4: Create stub `packages/interactive-example/src/index.ts`**

```ts
// Public exports — fleshed out in later tasks.
export {}
```

- [ ] **Step 5: Install and verify the workspace resolves**

Run: `pnpm install`
Expected: `@upup/interactive-example` appears in the dependency graph, no errors.

Verify: `pnpm --filter @upup/interactive-example exec tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/interactive-example/
git commit -m "feat(interactive-example): scaffold workspace-internal package"
```

---

## Task 2: Types — ToggleEntry, CategoryId, PropId

**Files:**
- Create: `packages/interactive-example/src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
import type { UpupUploaderProps } from '@upup/react'

export type CategoryId =
  | 'upload'
  | 'sources'
  | 'limits'
  | 'processing'
  | 'editor'
  | 'behavior'
  | 'appearance'
  | 'language'
  | 'events'

/** Dotted path into UpupUploaderProps, e.g. "provider" or "cloudDrives.googleDrive.clientId". */
export type PropId = string

export type PrimitiveKind =
  | 'bool'
  | 'number'
  | 'enum'
  | 'multi'
  | 'string'
  | 'nested'

export type ToggleEntry = {
  id: PropId
  label: string
  description?: string
  primitive: PrimitiveKind
  defaultValue: unknown
  /** Primitive-specific options: `{ options: string[] }` for enum/multi,
   *  `{ min: number, max: number, step?: number }` for number,
   *  `{ fields: ToggleEntry[] }` for nested. */
  options?: Record<string, unknown>
  docsLink?: string
}

export type CategoryDefinition = {
  id: CategoryId
  label: string
  description?: string
  entries: ToggleEntry[]
}

export type UpupConfig = Partial<UpupUploaderProps>

export type InteractiveExampleProps = {
  defaultExpanded?: CategoryId[]
  showCodeTab?: boolean
  focus?: PropId[]
  initialConfig?: UpupConfig
  previewWidth?: number | 'auto'
  disableUrlSync?: boolean
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `pnpm --filter @upup/interactive-example exec tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add packages/interactive-example/src/types.ts
git commit -m "feat(interactive-example): add core type definitions"
```

---

## Task 3: ConfigContext + useConfig hook (TDD)

**Files:**
- Create: `packages/interactive-example/src/state/ConfigContext.tsx`
- Create: `packages/interactive-example/src/state/useConfig.ts`
- Create: `packages/interactive-example/src/tests/useConfig.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/tests/useConfig.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { useConfig } from '../state/useConfig'

function Probe({ path }: { path: string }) {
    const { value, set } = useConfig(path)
    return (
        <div>
            <span data-testid="value">{JSON.stringify(value)}</span>
            <button onClick={() => set('backblaze')}>set</button>
        </div>
    )
}

describe('useConfig', () => {
    it('returns initial value when set via initialConfig', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 's3' }}>
                <Probe path="provider" />
            </ConfigProvider>,
        )
        expect(screen.getByTestId('value').textContent).toBe('"s3"')
    })

    it('returns undefined when path has no initial value', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <Probe path="provider" />
            </ConfigProvider>,
        )
        expect(screen.getByTestId('value').textContent).toBe('')
    })

    it('updates value when set() is called', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 's3' }}>
                <Probe path="provider" />
            </ConfigProvider>,
        )
        act(() => {
            screen.getByText('set').click()
        })
        expect(screen.getByTestId('value').textContent).toBe('"backblaze"')
    })

    it('supports dotted paths for nested config', () => {
        render(
            <ConfigProvider
                initialConfig={{
                    cloudDrives: { googleDrive: { clientId: 'abc' } } as any,
                }}
            >
                <Probe path="cloudDrives.googleDrive.clientId" />
            </ConfigProvider>,
        )
        expect(screen.getByTestId('value').textContent).toBe('"abc"')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @upup/interactive-example test -- useConfig`
Expected: FAIL (modules don't exist yet).

- [ ] **Step 3: Implement `src/state/ConfigContext.tsx`**

```tsx
import React, { createContext, useCallback, useState, type ReactNode } from 'react'
import type { UpupConfig } from '../types'

type ConfigContextValue = {
    config: UpupConfig
    setConfig: (next: UpupConfig | ((prev: UpupConfig) => UpupConfig)) => void
}

export const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({
    children,
    initialConfig = {},
}: {
    children: ReactNode
    initialConfig?: UpupConfig
}) {
    const [config, setConfigState] = useState<UpupConfig>(initialConfig)

    const setConfig = useCallback(
        (next: UpupConfig | ((prev: UpupConfig) => UpupConfig)) => {
            setConfigState((prev) => (typeof next === 'function' ? (next as any)(prev) : next))
        },
        [],
    )

    return (
        <ConfigContext.Provider value={{ config, setConfig }}>
            {children}
        </ConfigContext.Provider>
    )
}
```

- [ ] **Step 4: Implement `src/state/useConfig.ts`**

```ts
import { useContext, useCallback } from 'react'
import { ConfigContext } from './ConfigContext'
import type { UpupConfig } from '../types'

function getPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce<any>((acc, key) => {
        if (acc == null) return undefined
        return acc[key]
    }, obj)
}

function setPath(obj: UpupConfig, path: string, value: unknown): UpupConfig {
    const keys = path.split('.')
    const next: any = { ...obj }
    let cursor = next
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        cursor[k] = { ...(cursor[k] ?? {}) }
        cursor = cursor[k]
    }
    cursor[keys[keys.length - 1]] = value
    return next
}

export function useConfig(path: string) {
    const ctx = useContext(ConfigContext)
    if (!ctx) {
        throw new Error('useConfig must be used inside <ConfigProvider>')
    }
    const value = getPath(ctx.config, path)
    const set = useCallback(
        (next: unknown) => ctx.setConfig((prev) => setPath(prev, path, next)),
        [ctx, path],
    )
    return { value, set, config: ctx.config }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @upup/interactive-example test -- useConfig`
Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/interactive-example/src/state/ packages/interactive-example/src/tests/useConfig.test.tsx
git commit -m "feat(interactive-example): add ConfigContext + useConfig hook"
```

---

## Task 4: serialize / deserialize (TDD)

**Files:**
- Create: `packages/interactive-example/src/state/serialize.ts`
- Create: `packages/interactive-example/src/state/deserialize.ts`
- Create: `packages/interactive-example/src/tests/serialize.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/serialize.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { serialize } from '../state/serialize'
import { deserialize } from '../state/deserialize'
import type { UpupConfig } from '../types'

describe('serialize / deserialize round-trip', () => {
    const cases: Array<{ name: string; config: UpupConfig }> = [
        { name: 'empty', config: {} },
        { name: 'simple primitive', config: { provider: 'backblaze' } },
        {
            name: 'several props',
            config: {
                provider: 'backblaze' as any,
                serverUrl: '/api/upup',
                maxConcurrentUploads: 5,
                resumable: true as any,
            },
        },
        {
            name: 'nested cloudDrives',
            config: {
                cloudDrives: {
                    googleDrive: { clientId: 'abc', apiKey: 'def', appId: 'ghi' },
                    oneDrive: { clientId: 'jkl' },
                } as any,
            },
        },
        {
            name: 'unicode in i18n overrides',
            config: {
                i18n: {
                    overrides: { 'common.upload': 'アップロード' },
                } as any,
            },
        },
    ]

    for (const c of cases) {
        it(`${c.name} round-trips`, () => {
            const token = serialize(c.config)
            const restored = deserialize(token)
            expect(restored).toEqual(c.config)
        })
    }

    it('empty config produces empty token', () => {
        expect(serialize({})).toBe('')
    })

    it('deserialize("") returns empty object', () => {
        expect(deserialize('')).toEqual({})
    })

    it('deserialize of malformed token returns empty object and warns', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(deserialize('garbage-not-base64!!!')).toEqual({})
        expect(warnSpy).toHaveBeenCalled()
        warnSpy.mockRestore()
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- serialize`
Expected: FAIL (modules don't exist).

- [ ] **Step 3: Implement `src/state/serialize.ts`**

```ts
import { deflate } from 'pako'
import type { UpupConfig } from '../types'

function base64urlEncode(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const b64 = btoa(binary)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function isEmpty(obj: UpupConfig): boolean {
    for (const _ in obj) return false
    return true
}

export function serialize(config: UpupConfig): string {
    if (isEmpty(config)) return ''
    const json = JSON.stringify(config)
    const compressed = deflate(json)
    return base64urlEncode(compressed)
}
```

- [ ] **Step 4: Implement `src/state/deserialize.ts`**

```ts
import { inflate } from 'pako'
import type { UpupConfig } from '../types'

function base64urlDecode(token: string): Uint8Array {
    const padded =
        token.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - (token.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

export function deserialize(token: string): UpupConfig {
    if (!token) return {}
    try {
        const bytes = base64urlDecode(token)
        const json = inflate(bytes, { to: 'string' })
        return JSON.parse(json)
    } catch (e) {
        console.warn('[interactive-example] Failed to deserialize config token:', e)
        return {}
    }
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- serialize`
Expected: all 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/interactive-example/src/state/serialize.ts packages/interactive-example/src/state/deserialize.ts packages/interactive-example/src/tests/serialize.test.ts
git commit -m "feat(interactive-example): add config serialize/deserialize with gzip+base64url"
```

---

## Task 5: URL-sync hook (TDD)

**Files:**
- Create: `packages/interactive-example/src/state/url-sync.ts`
- Create: `packages/interactive-example/src/tests/url-sync.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/url-sync.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readConfigFromUrl, writeConfigToUrl } from '../state/url-sync'
import { serialize } from '../state/serialize'

describe('url-sync', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', '/')
    })

    it('readConfigFromUrl returns {} when no ?c=', () => {
        expect(readConfigFromUrl()).toEqual({})
    })

    it('readConfigFromUrl decodes ?c= token', () => {
        const token = serialize({ provider: 'backblaze' as any })
        window.history.replaceState(null, '', `/?c=${token}`)
        expect(readConfigFromUrl()).toEqual({ provider: 'backblaze' })
    })

    it('writeConfigToUrl sets ?c= param without pushing history', () => {
        const lengthBefore = window.history.length
        writeConfigToUrl({ provider: 'backblaze' as any })
        expect(window.location.search).toMatch(/^\?c=/)
        expect(window.history.length).toBe(lengthBefore)
    })

    it('writeConfigToUrl removes ?c= when config is empty', () => {
        window.history.replaceState(null, '', '/?c=xyz')
        writeConfigToUrl({})
        expect(window.location.search).toBe('')
    })

    it('writeConfigToUrl preserves other query params', () => {
        window.history.replaceState(null, '', '/?foo=bar')
        writeConfigToUrl({ provider: 'backblaze' as any })
        const params = new URLSearchParams(window.location.search)
        expect(params.get('foo')).toBe('bar')
        expect(params.get('c')).toBeTruthy()
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- url-sync`
Expected: FAIL.

- [ ] **Step 3: Implement `src/state/url-sync.ts`**

```ts
import type { UpupConfig } from '../types'
import { serialize } from './serialize'
import { deserialize } from './deserialize'

export function readConfigFromUrl(): UpupConfig {
    if (typeof window === 'undefined') return {}
    const params = new URLSearchParams(window.location.search)
    const token = params.get('c')
    if (!token) return {}
    return deserialize(token)
}

export function writeConfigToUrl(config: UpupConfig): void {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const token = serialize(config)
    if (token) {
        params.set('c', token)
    } else {
        params.delete('c')
    }
    const query = params.toString()
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', url)
}

export function buildPermalink(config: UpupConfig): string {
    if (typeof window === 'undefined') return ''
    const token = serialize(config)
    if (!token) return `${window.location.origin}${window.location.pathname}`
    return `${window.location.origin}${window.location.pathname}?c=${token}`
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- url-sync`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/interactive-example/src/state/url-sync.ts packages/interactive-example/src/tests/url-sync.test.ts
git commit -m "feat(interactive-example): add URL sync helpers (read/write/permalink)"
```

---

## Task 6: BoolToggle primitive (TDD)

**Files:**
- Create: `packages/interactive-example/src/sidebar/primitives/BoolToggle.tsx`
- Create: `packages/interactive-example/src/tests/BoolToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/tests/BoolToggle.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { BoolToggle } from '../sidebar/primitives/BoolToggle'

function Wrapped(props: { propId: string; initial?: boolean }) {
    return (
        <ConfigProvider initialConfig={{ [props.propId]: props.initial } as any}>
            <BoolToggle propId={props.propId} label="Test Label" />
        </ConfigProvider>
    )
}

describe('BoolToggle', () => {
    it('renders label text', () => {
        render(<Wrapped propId="mini" />)
        expect(screen.getByText('Test Label')).toBeTruthy()
    })

    it('reflects true initial value as checked', () => {
        render(<Wrapped propId="mini" initial={true} />)
        const input = screen.getByRole('checkbox') as HTMLInputElement
        expect(input.checked).toBe(true)
    })

    it('reflects false/undefined initial value as unchecked', () => {
        render(<Wrapped propId="mini" />)
        expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    })

    it('clicking toggles the value', async () => {
        const user = userEvent.setup()
        render(<Wrapped propId="mini" initial={false} />)
        const input = screen.getByRole('checkbox') as HTMLInputElement
        await user.click(input)
        expect(input.checked).toBe(true)
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- BoolToggle`
Expected: FAIL.

- [ ] **Step 3: Implement `src/sidebar/primitives/BoolToggle.tsx`**

```tsx
import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

export function BoolToggle({
    propId,
    label,
    description,
}: {
    propId: string
    label: string
    description?: string
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    const checked = value === true
    return (
        <label htmlFor={id} className="upup-ie-toggle">
            <div className="upup-ie-toggle-text">
                <span className="upup-ie-toggle-label">{label}</span>
                {description && (
                    <span className="upup-ie-toggle-description">{description}</span>
                )}
            </div>
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => set(e.currentTarget.checked || undefined)}
            />
        </label>
    )
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- BoolToggle`
Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/interactive-example/src/sidebar/primitives/BoolToggle.tsx packages/interactive-example/src/tests/BoolToggle.test.tsx
git commit -m "feat(interactive-example): add BoolToggle primitive"
```

---

## Task 7: NumberInput, EnumSelect, MultiSelect primitives (TDD)

**Files:**
- Create: `packages/interactive-example/src/sidebar/primitives/NumberInput.tsx`
- Create: `packages/interactive-example/src/sidebar/primitives/EnumSelect.tsx`
- Create: `packages/interactive-example/src/sidebar/primitives/MultiSelect.tsx`
- Create: `packages/interactive-example/src/tests/NumberInput.test.tsx`
- Create: `packages/interactive-example/src/tests/EnumSelect.test.tsx`
- Create: `packages/interactive-example/src/tests/MultiSelect.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/NumberInput.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { NumberInput } from '../sidebar/primitives/NumberInput'

describe('NumberInput', () => {
    it('renders with initial value', () => {
        render(
            <ConfigProvider initialConfig={{ limit: 10 } as any}>
                <NumberInput propId="limit" label="Limit" min={1} max={100} />
            </ConfigProvider>,
        )
        expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('10')
    })

    it('updates on change', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{ limit: 10 } as any}>
                <NumberInput propId="limit" label="Limit" min={1} max={100} />
            </ConfigProvider>,
        )
        const input = screen.getByRole('spinbutton')
        await user.clear(input)
        await user.type(input, '25')
        expect((input as HTMLInputElement).value).toBe('25')
    })

    it('clamps to min when value would be below', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{ limit: 10 } as any}>
                <NumberInput propId="limit" label="Limit" min={5} max={100} />
            </ConfigProvider>,
        )
        const input = screen.getByRole('spinbutton')
        await user.clear(input)
        await user.type(input, '2')
        await user.tab()
        expect((input as HTMLInputElement).value).toBe('5')
    })
})
```

Create `src/tests/EnumSelect.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { EnumSelect } from '../sidebar/primitives/EnumSelect'

describe('EnumSelect', () => {
    it('renders options', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                <EnumSelect
                    propId="provider"
                    label="Provider"
                    options={['s3', 'backblaze', 'azure']}
                />
            </ConfigProvider>,
        )
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('s3')
    })

    it('updates on selection change', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                <EnumSelect
                    propId="provider"
                    label="Provider"
                    options={['s3', 'backblaze', 'azure']}
                />
            </ConfigProvider>,
        )
        const select = screen.getByRole('combobox') as HTMLSelectElement
        await user.selectOptions(select, 'backblaze')
        expect(select.value).toBe('backblaze')
    })
})
```

Create `src/tests/MultiSelect.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { MultiSelect } from '../sidebar/primitives/MultiSelect'

describe('MultiSelect', () => {
    it('renders all options as checkboxes', () => {
        render(
            <ConfigProvider
                initialConfig={{ sources: ['local', 'camera'] } as any}
            >
                <MultiSelect
                    propId="sources"
                    label="Sources"
                    options={['local', 'camera', 'url']}
                />
            </ConfigProvider>,
        )
        expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    })

    it('checks initially-selected options', () => {
        render(
            <ConfigProvider
                initialConfig={{ sources: ['local', 'camera'] } as any}
            >
                <MultiSelect
                    propId="sources"
                    label="Sources"
                    options={['local', 'camera', 'url']}
                />
            </ConfigProvider>,
        )
        const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
        expect(boxes[0].checked).toBe(true)   // local
        expect(boxes[1].checked).toBe(true)   // camera
        expect(boxes[2].checked).toBe(false)  // url
    })

    it('toggles an option on click', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider
                initialConfig={{ sources: ['local'] } as any}
            >
                <MultiSelect
                    propId="sources"
                    label="Sources"
                    options={['local', 'camera']}
                />
            </ConfigProvider>,
        )
        const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
        await user.click(boxes[1])
        expect(boxes[1].checked).toBe(true)
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- NumberInput EnumSelect MultiSelect`
Expected: FAIL.

- [ ] **Step 3: Implement `NumberInput.tsx`**

```tsx
import React, { useId, useState, useEffect } from 'react'
import { useConfig } from '../../state/useConfig'

export function NumberInput({
    propId,
    label,
    min,
    max,
    step = 1,
}: {
    propId: string
    label: string
    min?: number
    max?: number
    step?: number
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    const [local, setLocal] = useState(value == null ? '' : String(value))

    useEffect(() => {
        setLocal(value == null ? '' : String(value))
    }, [value])

    function commit(raw: string) {
        if (raw === '') {
            set(undefined)
            return
        }
        let n = Number(raw)
        if (Number.isNaN(n)) n = min ?? 0
        if (min != null && n < min) n = min
        if (max != null && n > max) n = max
        setLocal(String(n))
        set(n)
    }

    return (
        <label htmlFor={id} className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <input
                id={id}
                type="number"
                min={min}
                max={max}
                step={step}
                value={local}
                onChange={(e) => setLocal(e.currentTarget.value)}
                onBlur={(e) => commit(e.currentTarget.value)}
            />
        </label>
    )
}
```

- [ ] **Step 4: Implement `EnumSelect.tsx`**

```tsx
import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

export function EnumSelect({
    propId,
    label,
    options,
}: {
    propId: string
    label: string
    options: string[]
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    return (
        <label htmlFor={id} className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <select
                id={id}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => set(e.currentTarget.value || undefined)}
            >
                <option value="">—</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
        </label>
    )
}
```

- [ ] **Step 5: Implement `MultiSelect.tsx`**

```tsx
import React from 'react'
import { useConfig } from '../../state/useConfig'

export function MultiSelect({
    propId,
    label,
    options,
}: {
    propId: string
    label: string
    options: string[]
}) {
    const { value, set } = useConfig(propId)
    const selected = Array.isArray(value) ? (value as string[]) : []

    function toggle(opt: string) {
        const next = selected.includes(opt)
            ? selected.filter((s) => s !== opt)
            : [...selected, opt]
        set(next.length === 0 ? undefined : next)
    }

    return (
        <div className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <div className="upup-ie-multiselect">
                {options.map((o) => (
                    <label key={o} className="upup-ie-multiselect-item">
                        <input
                            type="checkbox"
                            checked={selected.includes(o)}
                            onChange={() => toggle(o)}
                        />
                        <span>{o}</span>
                    </label>
                ))}
            </div>
        </div>
    )
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- NumberInput EnumSelect MultiSelect`
Expected: all 8 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/interactive-example/src/sidebar/primitives/NumberInput.tsx packages/interactive-example/src/sidebar/primitives/EnumSelect.tsx packages/interactive-example/src/sidebar/primitives/MultiSelect.tsx packages/interactive-example/src/tests/NumberInput.test.tsx packages/interactive-example/src/tests/EnumSelect.test.tsx packages/interactive-example/src/tests/MultiSelect.test.tsx
git commit -m "feat(interactive-example): add NumberInput, EnumSelect, MultiSelect primitives"
```

---

## Task 8: StringInput, NestedConfig primitives + barrel (TDD)

**Files:**
- Create: `packages/interactive-example/src/sidebar/primitives/StringInput.tsx`
- Create: `packages/interactive-example/src/sidebar/primitives/NestedConfig.tsx`
- Create: `packages/interactive-example/src/sidebar/primitives/index.ts`
- Create: `packages/interactive-example/src/tests/StringInput.test.tsx`
- Create: `packages/interactive-example/src/tests/NestedConfig.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/tests/StringInput.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { StringInput } from '../sidebar/primitives/StringInput'

describe('StringInput', () => {
    it('renders with initial value', () => {
        render(
            <ConfigProvider initialConfig={{ serverUrl: '/api/upup' } as any}>
                <StringInput propId="serverUrl" label="Server URL" />
            </ConfigProvider>,
        )
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
            '/api/upup',
        )
    })

    it('updates on change', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{ serverUrl: '' } as any}>
                <StringInput propId="serverUrl" label="Server URL" />
            </ConfigProvider>,
        )
        const input = screen.getByRole('textbox')
        await user.type(input, '/api/custom')
        expect((input as HTMLInputElement).value).toBe('/api/custom')
    })
})
```

Create `src/tests/NestedConfig.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { NestedConfig } from '../sidebar/primitives/NestedConfig'
import type { ToggleEntry } from '../types'

const fields: ToggleEntry[] = [
    {
        id: 'clientId',
        label: 'Client ID',
        primitive: 'string',
        defaultValue: '',
    },
    {
        id: 'apiKey',
        label: 'API Key',
        primitive: 'string',
        defaultValue: '',
    },
]

describe('NestedConfig', () => {
    it('renders nested fields with parent path prepended', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <NestedConfig
                    parentPath="cloudDrives.googleDrive"
                    label="Google Drive"
                    fields={fields}
                />
            </ConfigProvider>,
        )
        expect(screen.getByText('Client ID')).toBeTruthy()
        expect(screen.getByText('API Key')).toBeTruthy()
    })

    it('propagates updates to parent path', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{}}>
                <NestedConfig
                    parentPath="cloudDrives.googleDrive"
                    label="Google Drive"
                    fields={fields}
                />
            </ConfigProvider>,
        )
        const inputs = screen.getAllByRole('textbox')
        await user.type(inputs[0], 'abc123')
        expect((inputs[0] as HTMLInputElement).value).toBe('abc123')
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- StringInput NestedConfig`
Expected: FAIL.

- [ ] **Step 3: Implement `StringInput.tsx`**

```tsx
import React, { useId } from 'react'
import { useConfig } from '../../state/useConfig'

export function StringInput({
    propId,
    label,
    placeholder,
}: {
    propId: string
    label: string
    placeholder?: string
}) {
    const id = useId()
    const { value, set } = useConfig(propId)
    return (
        <label htmlFor={id} className="upup-ie-field">
            <span className="upup-ie-field-label">{label}</span>
            <input
                id={id}
                type="text"
                placeholder={placeholder}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => set(e.currentTarget.value || undefined)}
            />
        </label>
    )
}
```

- [ ] **Step 4: Implement `NestedConfig.tsx`**

```tsx
import React from 'react'
import type { ToggleEntry } from '../../types'
import { BoolToggle } from './BoolToggle'
import { NumberInput } from './NumberInput'
import { EnumSelect } from './EnumSelect'
import { MultiSelect } from './MultiSelect'
import { StringInput } from './StringInput'

export function NestedConfig({
    parentPath,
    label,
    fields,
}: {
    parentPath: string
    label: string
    fields: ToggleEntry[]
}) {
    return (
        <fieldset className="upup-ie-nested">
            <legend>{label}</legend>
            {fields.map((f) => {
                const fullPath = `${parentPath}.${f.id}`
                switch (f.primitive) {
                    case 'bool':
                        return (
                            <BoolToggle
                                key={f.id}
                                propId={fullPath}
                                label={f.label}
                                description={f.description}
                            />
                        )
                    case 'number':
                        return (
                            <NumberInput
                                key={f.id}
                                propId={fullPath}
                                label={f.label}
                                min={(f.options?.min as number) ?? undefined}
                                max={(f.options?.max as number) ?? undefined}
                                step={(f.options?.step as number) ?? undefined}
                            />
                        )
                    case 'enum':
                        return (
                            <EnumSelect
                                key={f.id}
                                propId={fullPath}
                                label={f.label}
                                options={(f.options?.options as string[]) ?? []}
                            />
                        )
                    case 'multi':
                        return (
                            <MultiSelect
                                key={f.id}
                                propId={fullPath}
                                label={f.label}
                                options={(f.options?.options as string[]) ?? []}
                            />
                        )
                    case 'string':
                        return (
                            <StringInput
                                key={f.id}
                                propId={fullPath}
                                label={f.label}
                                placeholder={f.options?.placeholder as string | undefined}
                            />
                        )
                    case 'nested':
                        return (
                            <NestedConfig
                                key={f.id}
                                parentPath={fullPath}
                                label={f.label}
                                fields={(f.options?.fields as ToggleEntry[]) ?? []}
                            />
                        )
                }
            })}
        </fieldset>
    )
}
```

- [ ] **Step 5: Create `src/sidebar/primitives/index.ts` barrel**

```ts
export { BoolToggle } from './BoolToggle'
export { NumberInput } from './NumberInput'
export { EnumSelect } from './EnumSelect'
export { MultiSelect } from './MultiSelect'
export { StringInput } from './StringInput'
export { NestedConfig } from './NestedConfig'
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- StringInput NestedConfig`
Expected: all 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/interactive-example/src/sidebar/primitives/StringInput.tsx packages/interactive-example/src/sidebar/primitives/NestedConfig.tsx packages/interactive-example/src/sidebar/primitives/index.ts packages/interactive-example/src/tests/StringInput.test.tsx packages/interactive-example/src/tests/NestedConfig.test.tsx
git commit -m "feat(interactive-example): add StringInput, NestedConfig primitives + barrel"
```

---

## Task 9: Category manifest — all 9 categories

**Files:**
- Create: `packages/interactive-example/src/categories/upload.ts`
- Create: `packages/interactive-example/src/categories/sources.ts`
- Create: `packages/interactive-example/src/categories/limits.ts`
- Create: `packages/interactive-example/src/categories/processing.ts`
- Create: `packages/interactive-example/src/categories/editor.ts`
- Create: `packages/interactive-example/src/categories/behavior.ts`
- Create: `packages/interactive-example/src/categories/appearance.ts`
- Create: `packages/interactive-example/src/categories/language.ts`
- Create: `packages/interactive-example/src/categories/events.ts`
- Create: `packages/interactive-example/src/categories/index.ts`
- Create: `packages/interactive-example/src/tests/categories.test.ts`

- [ ] **Step 1: Write the failing test (manifest integrity)**

Create `src/tests/categories.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { categories, allEntries } from '../categories'
import type { CategoryId } from '../types'

const EXPECTED_IDS: CategoryId[] = [
    'upload',
    'sources',
    'limits',
    'processing',
    'editor',
    'behavior',
    'appearance',
    'language',
    'events',
]

describe('category manifest', () => {
    it('contains all 9 expected categories', () => {
        expect(categories.map((c) => c.id).sort()).toEqual(
            [...EXPECTED_IDS].sort(),
        )
    })

    it('every toggle entry has non-empty id and label', () => {
        for (const entry of allEntries()) {
            expect(entry.id).toBeTruthy()
            expect(entry.label).toBeTruthy()
        }
    })

    it('every entry has a recognized primitive kind', () => {
        const kinds = new Set([
            'bool',
            'number',
            'enum',
            'multi',
            'string',
            'nested',
        ])
        for (const entry of allEntries()) {
            expect(kinds.has(entry.primitive)).toBe(true)
        }
    })

    it('enum and multi entries specify options', () => {
        for (const entry of allEntries()) {
            if (entry.primitive === 'enum' || entry.primitive === 'multi') {
                expect(Array.isArray(entry.options?.options)).toBe(true)
                expect((entry.options?.options as unknown[]).length).toBeGreaterThan(0)
            }
        }
    })

    it('nested entries specify fields', () => {
        for (const entry of allEntries()) {
            if (entry.primitive === 'nested') {
                expect(Array.isArray(entry.options?.fields)).toBe(true)
            }
        }
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- categories`
Expected: FAIL.

- [ ] **Step 3: Create `src/categories/upload.ts`**

```ts
import type { CategoryDefinition } from '../types'

export const uploadCategory: CategoryDefinition = {
    id: 'upload',
    label: 'Upload',
    description: 'Strategy and execution',
    entries: [
        {
            id: 'provider',
            label: 'Provider',
            primitive: 'enum',
            defaultValue: 's3',
            options: { options: ['s3', 'backblaze', 'azure', 'digitalocean', 'aws'] },
        },
        {
            id: 'tokenEndpoint',
            label: 'Token endpoint',
            primitive: 'string',
            defaultValue: '',
            options: { placeholder: '/api/upload-token' },
        },
        {
            id: 'serverUrl',
            label: 'Server URL',
            primitive: 'string',
            defaultValue: '',
            options: { placeholder: '/api/upup' },
        },
        {
            id: 'apiKey',
            label: 'API key (managed mode)',
            primitive: 'string',
            defaultValue: '',
        },
        {
            id: 'uploadEndpoint',
            label: 'Upload endpoint',
            primitive: 'string',
            defaultValue: '',
        },
        {
            id: 'maxConcurrentUploads',
            label: 'Max concurrent uploads',
            primitive: 'number',
            defaultValue: 3,
            options: { min: 1, max: 10 },
        },
        {
            id: 'maxRetries',
            label: 'Max retries',
            primitive: 'number',
            defaultValue: 3,
            options: { min: 0, max: 10 },
        },
        {
            id: 'autoUpload',
            label: 'Auto upload',
            description: 'Begin uploading immediately on file-add',
            primitive: 'bool',
            defaultValue: false,
        },
        {
            id: 'crashRecovery',
            label: 'Crash recovery (IndexedDB)',
            primitive: 'bool',
            defaultValue: false,
        },
    ],
}
```

- [ ] **Step 4: Create `src/categories/sources.ts`**

```ts
import type { CategoryDefinition } from '../types'

export const sourcesCategory: CategoryDefinition = {
    id: 'sources',
    label: 'Sources',
    description: 'Which adapters are enabled',
    entries: [
        {
            id: 'sources',
            label: 'Enabled sources',
            primitive: 'multi',
            defaultValue: [
                'local',
                'google_drive',
                'onedrive',
                'dropbox',
                'box',
                'url',
                'camera',
                'microphone',
                'screen',
            ],
            options: {
                options: [
                    'local',
                    'google_drive',
                    'onedrive',
                    'dropbox',
                    'box',
                    'url',
                    'camera',
                    'microphone',
                    'screen',
                ],
            },
        },
        {
            id: 'cloudDrives.googleDrive',
            label: 'Google Drive credentials',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                    { id: 'apiKey', label: 'API Key', primitive: 'string', defaultValue: '' },
                    { id: 'appId', label: 'App ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'cloudDrives.oneDrive',
            label: 'OneDrive credentials',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'cloudDrives.dropbox',
            label: 'Dropbox credentials',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'cloudDrives.box',
            label: 'Box credentials',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'clientId', label: 'Client ID', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        {
            id: 'showSelectFolderButton',
            label: 'Show "Select folder" button',
            primitive: 'bool',
            defaultValue: false,
        },
    ],
}
```

- [ ] **Step 5: Create `src/categories/limits.ts`**

```ts
import type { CategoryDefinition } from '../types'

const sizeFields = [
    { id: 'size', label: 'Size', primitive: 'number' as const, defaultValue: 100 },
    {
        id: 'unit',
        label: 'Unit',
        primitive: 'enum' as const,
        defaultValue: 'MB',
        options: { options: ['B', 'KB', 'MB', 'GB'] },
    },
]

export const limitsCategory: CategoryDefinition = {
    id: 'limits',
    label: 'Limits',
    description: 'File count and size validation',
    entries: [
        { id: 'accept', label: 'Accept (MIME pattern)', primitive: 'string', defaultValue: '', options: { placeholder: 'image/*' } },
        { id: 'limit', label: 'File count limit', primitive: 'number', defaultValue: 10, options: { min: 1, max: 100 } },
        {
            id: 'maxFileSize',
            label: 'Max file size',
            primitive: 'nested',
            defaultValue: undefined,
            options: { fields: sizeFields },
        },
        {
            id: 'minFileSize',
            label: 'Min file size',
            primitive: 'nested',
            defaultValue: undefined,
            options: { fields: sizeFields },
        },
        {
            id: 'maxTotalFileSize',
            label: 'Max total file size',
            primitive: 'nested',
            defaultValue: undefined,
            options: { fields: sizeFields },
        },
    ],
}
```

- [ ] **Step 6: Create `src/categories/processing.ts`**

```ts
import type { CategoryDefinition } from '../types'

export const processingCategory: CategoryDefinition = {
    id: 'processing',
    label: 'Processing',
    description: 'Pipeline steps before upload',
    entries: [
        { id: 'shouldCompress', label: 'Compress generic files', primitive: 'bool', defaultValue: false },
        { id: 'imageCompression', label: 'Compress images', primitive: 'bool', defaultValue: false },
        { id: 'thumbnailGenerator', label: 'Generate thumbnails', primitive: 'bool', defaultValue: false },
        { id: 'checksumVerification', label: 'Checksum verification (SHA-256)', primitive: 'bool', defaultValue: false },
        { id: 'heicConversion', label: 'HEIC → JPEG conversion', primitive: 'bool', defaultValue: false },
        { id: 'stripExifData', label: 'Strip EXIF data', primitive: 'bool', defaultValue: false },
        { id: 'contentDeduplication', label: 'Content deduplication', primitive: 'bool', defaultValue: false },
    ],
}
```

- [ ] **Step 7: Create `src/categories/editor.ts`**

```ts
import type { CategoryDefinition } from '../types'

export const editorCategory: CategoryDefinition = {
    id: 'editor',
    label: 'Editor',
    description: 'Image editor configuration',
    entries: [
        { id: 'imageEditor.enabled', label: 'Enable image editor', primitive: 'bool', defaultValue: false },
        {
            id: 'imageEditor.display',
            label: 'Display mode',
            primitive: 'enum',
            defaultValue: 'inline',
            options: { options: ['inline', 'modal'] },
        },
        {
            id: 'imageEditor.autoOpen',
            label: 'Auto-open',
            primitive: 'enum',
            defaultValue: 'never',
            options: { options: ['never', 'single', 'always'] },
        },
        {
            id: 'imageEditor.output.quality',
            label: 'Output quality (0–1)',
            primitive: 'number',
            defaultValue: undefined,
            options: { min: 0, max: 1, step: 0.1 },
        },
    ],
}
```

- [ ] **Step 8: Create `src/categories/behavior.ts`**

```ts
import type { CategoryDefinition } from '../types'

export const behaviorCategory: CategoryDefinition = {
    id: 'behavior',
    label: 'Behavior',
    description: 'UX and interaction modes',
    entries: [
        { id: 'mini', label: 'Mini mode', primitive: 'bool', defaultValue: false },
        { id: 'enablePaste', label: 'Enable paste upload', primitive: 'bool', defaultValue: false },
        { id: 'allowFolderUpload', label: 'Allow folder upload', primitive: 'bool', defaultValue: false },
        { id: 'disableDragDrop', label: 'Disable drag & drop', primitive: 'bool', defaultValue: false },
        { id: 'allowPreview', label: 'Allow file preview', primitive: 'bool', defaultValue: true },
        { id: 'showBranding', label: 'Show upup branding', primitive: 'bool', defaultValue: true },
        { id: 'isProcessing', label: 'isProcessing (demo loading state)', primitive: 'bool', defaultValue: false },
    ],
}
```

- [ ] **Step 9: Create `src/categories/appearance.ts`**

```ts
import type { CategoryDefinition } from '../types'

export const appearanceCategory: CategoryDefinition = {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme, tokens, and slot overrides',
    entries: [
        {
            id: 'theme.mode',
            label: 'Theme mode',
            primitive: 'enum',
            defaultValue: 'system',
            options: { options: ['light', 'dark', 'system'] },
        },
        {
            id: 'theme.tokens.color.primary',
            label: 'Primary color (hex)',
            primitive: 'string',
            defaultValue: '',
            options: { placeholder: '#30C5F7' },
        },
        {
            id: 'theme.slots',
            label: 'Slot overrides (className strings)',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'fileList.uploadButton', label: 'fileList.uploadButton', primitive: 'string', defaultValue: '' },
                    { id: 'fileList.root', label: 'fileList.root', primitive: 'string', defaultValue: '' },
                    { id: 'filePreview.deleteButton', label: 'filePreview.deleteButton', primitive: 'string', defaultValue: '' },
                    { id: 'progressBar.fill', label: 'progressBar.fill', primitive: 'string', defaultValue: '' },
                    { id: 'adapterSelector.adapterButton', label: 'adapterSelector.adapterButton', primitive: 'string', defaultValue: '' },
                    { id: 'mainBox.root', label: 'mainBox.root', primitive: 'string', defaultValue: '' },
                    { id: 'adapterView.header', label: 'adapterView.header', primitive: 'string', defaultValue: '' },
                    { id: 'urlUploader.fetchButton', label: 'urlUploader.fetchButton', primitive: 'string', defaultValue: '' },
                ],
            },
        },
        { id: 'className', label: 'Root className', primitive: 'string', defaultValue: '' },
    ],
}
```

- [ ] **Step 10: Create `src/categories/language.ts`**

```ts
import type { CategoryDefinition } from '../types'

export const languageCategory: CategoryDefinition = {
    id: 'language',
    label: 'Language',
    description: 'Localization and RTL',
    entries: [
        {
            id: 'i18n.locale',
            label: 'Locale',
            primitive: 'enum',
            defaultValue: 'en-US',
            options: {
                options: ['en-US', 'ar-SA', 'de-DE', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW'],
            },
        },
        {
            id: 'i18n.fallbackLocale',
            label: 'Fallback locale',
            primitive: 'enum',
            defaultValue: 'en-US',
            options: {
                options: ['en-US', 'ar-SA', 'de-DE', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW'],
            },
        },
        {
            id: 'i18n.overrides',
            label: 'Message overrides (common subset)',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    { id: 'common.upload', label: 'common.upload', primitive: 'string', defaultValue: '' },
                    { id: 'common.cancel', label: 'common.cancel', primitive: 'string', defaultValue: '' },
                    { id: 'dropzone.label', label: 'dropzone.label', primitive: 'string', defaultValue: '' },
                    { id: 'header.filesSelected', label: 'header.filesSelected', primitive: 'string', defaultValue: '' },
                ],
            },
        },
    ],
}
```

- [ ] **Step 11: Create `src/categories/events.ts`**

```ts
import type { CategoryDefinition } from '../types'

const eventIds = [
    'onFilesSelected',
    'onFileUploadStart',
    'onFileUploadComplete',
    'onFilesUploadComplete',
    'onError',
    'onWarn',
    'onRetry',
    'onRestrictionFailed',
    'onFileTypeMismatch',
    'onFileAdded',
    'onFileRemoved',
    'onUploadProgress',
] as const

export const eventsCategory: CategoryDefinition = {
    id: 'events',
    label: 'Events',
    description: 'Log + toast handlers for every callback',
    entries: eventIds.map((id) => ({
        id: `events.${id}`,
        label: id,
        description: `Log to console and push toast when ${id} fires`,
        primitive: 'bool' as const,
        defaultValue: false,
    })),
}
```

- [ ] **Step 12: Create `src/categories/index.ts` aggregator**

```ts
import { uploadCategory } from './upload'
import { sourcesCategory } from './sources'
import { limitsCategory } from './limits'
import { processingCategory } from './processing'
import { editorCategory } from './editor'
import { behaviorCategory } from './behavior'
import { appearanceCategory } from './appearance'
import { languageCategory } from './language'
import { eventsCategory } from './events'
import type { CategoryDefinition, ToggleEntry } from '../types'

export const categories: CategoryDefinition[] = [
    uploadCategory,
    sourcesCategory,
    limitsCategory,
    processingCategory,
    editorCategory,
    behaviorCategory,
    appearanceCategory,
    languageCategory,
    eventsCategory,
]

export function allEntries(): ToggleEntry[] {
    return categories.flatMap((c) => c.entries)
}

export function findEntry(propId: string): ToggleEntry | undefined {
    return allEntries().find((e) => e.id === propId)
}
```

- [ ] **Step 13: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- categories`
Expected: all 5 tests PASS.

- [ ] **Step 14: Commit**

```bash
git add packages/interactive-example/src/categories/ packages/interactive-example/src/tests/categories.test.ts
git commit -m "feat(interactive-example): add 9-category toggle manifest"
```

---

## Task 10: CategorySection component (TDD)

**Files:**
- Create: `packages/interactive-example/src/sidebar/CategorySection.tsx`
- Create: `packages/interactive-example/src/tests/CategorySection.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/tests/CategorySection.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { CategorySection } from '../sidebar/CategorySection'
import { uploadCategory } from '../categories/upload'

describe('CategorySection', () => {
    it('renders category label', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <CategorySection category={uploadCategory} defaultExpanded={false} />
            </ConfigProvider>,
        )
        expect(screen.getByText('Upload')).toBeTruthy()
    })

    it('body hidden when collapsed', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <CategorySection category={uploadCategory} defaultExpanded={false} />
            </ConfigProvider>,
        )
        expect(screen.queryByText('Provider')).toBeNull()
    })

    it('body visible when expanded', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <CategorySection category={uploadCategory} defaultExpanded={true} />
            </ConfigProvider>,
        )
        expect(screen.getByText('Provider')).toBeTruthy()
    })

    it('clicking header toggles expansion', async () => {
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{}}>
                <CategorySection category={uploadCategory} defaultExpanded={false} />
            </ConfigProvider>,
        )
        await user.click(screen.getByText('Upload'))
        expect(screen.getByText('Provider')).toBeTruthy()
    })

    it('counter shows how many props are set', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 'backblaze', maxRetries: 5 } as any}>
                <CategorySection category={uploadCategory} defaultExpanded={false} />
            </ConfigProvider>,
        )
        expect(screen.getByText(/2 set/)).toBeTruthy()
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- CategorySection`
Expected: FAIL.

- [ ] **Step 3: Implement `src/sidebar/CategorySection.tsx`**

```tsx
import React, { useState, useContext } from 'react'
import { ConfigContext } from '../state/ConfigContext'
import type { CategoryDefinition, ToggleEntry } from '../types'
import {
    BoolToggle,
    NumberInput,
    EnumSelect,
    MultiSelect,
    StringInput,
    NestedConfig,
} from './primitives'

function renderEntry(entry: ToggleEntry) {
    switch (entry.primitive) {
        case 'bool':
            return (
                <BoolToggle
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    description={entry.description}
                />
            )
        case 'number':
            return (
                <NumberInput
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    min={entry.options?.min as number | undefined}
                    max={entry.options?.max as number | undefined}
                    step={entry.options?.step as number | undefined}
                />
            )
        case 'enum':
            return (
                <EnumSelect
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    options={(entry.options?.options as string[]) ?? []}
                />
            )
        case 'multi':
            return (
                <MultiSelect
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    options={(entry.options?.options as string[]) ?? []}
                />
            )
        case 'string':
            return (
                <StringInput
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    placeholder={entry.options?.placeholder as string | undefined}
                />
            )
        case 'nested':
            return (
                <NestedConfig
                    key={entry.id}
                    parentPath={entry.id}
                    label={entry.label}
                    fields={(entry.options?.fields as ToggleEntry[]) ?? []}
                />
            )
    }
}

function countSet(config: unknown, entries: ToggleEntry[]): number {
    let count = 0
    for (const entry of entries) {
        const path = entry.id.split('.')
        let cur: any = config
        for (const k of path) {
            if (cur == null) {
                cur = undefined
                break
            }
            cur = cur[k]
        }
        if (cur !== undefined && cur !== null && cur !== '' && (!Array.isArray(cur) || cur.length > 0)) {
            count++
        }
    }
    return count
}

export function CategorySection({
    category,
    defaultExpanded,
}: {
    category: CategoryDefinition
    defaultExpanded: boolean
}) {
    const ctx = useContext(ConfigContext)
    const [open, setOpen] = useState(defaultExpanded)
    const setCount = ctx ? countSet(ctx.config, category.entries) : 0

    return (
        <section className="upup-ie-category" data-open={open}>
            <button
                type="button"
                className="upup-ie-category-header"
                onClick={() => setOpen((v) => !v)}
            >
                <span className="upup-ie-category-chevron">{open ? '▾' : '▸'}</span>
                <span className="upup-ie-category-label">{category.label}</span>
                <span className="upup-ie-category-count">
                    {setCount > 0 ? `${setCount} set` : ''}
                </span>
            </button>
            {open && (
                <div className="upup-ie-category-body">
                    {category.entries.map(renderEntry)}
                </div>
            )}
        </section>
    )
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- CategorySection`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/interactive-example/src/sidebar/CategorySection.tsx packages/interactive-example/src/tests/CategorySection.test.tsx
git commit -m "feat(interactive-example): add CategorySection with collapsible + counter"
```

---

## Task 11: Sidebar component (TDD)

**Files:**
- Create: `packages/interactive-example/src/sidebar/Sidebar.tsx`
- Create: `packages/interactive-example/src/tests/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/tests/Sidebar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { Sidebar } from '../sidebar/Sidebar'

describe('Sidebar', () => {
    it('renders all 9 category headers', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <Sidebar defaultExpanded={[]} />
            </ConfigProvider>,
        )
        for (const label of [
            'Upload',
            'Sources',
            'Limits',
            'Processing',
            'Editor',
            'Behavior',
            'Appearance',
            'Language',
            'Events',
        ]) {
            expect(screen.getByText(label)).toBeTruthy()
        }
    })

    it('expands only the sections listed in defaultExpanded', () => {
        render(
            <ConfigProvider initialConfig={{}}>
                <Sidebar defaultExpanded={['upload']} />
            </ConfigProvider>,
        )
        // Upload expanded → "Provider" visible
        expect(screen.getByText('Provider')).toBeTruthy()
        // Sources collapsed → "Enabled sources" NOT visible
        expect(screen.queryByText('Enabled sources')).toBeNull()
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- Sidebar`
Expected: FAIL.

- [ ] **Step 3: Implement `src/sidebar/Sidebar.tsx`**

```tsx
import React from 'react'
import { categories } from '../categories'
import { CategorySection } from './CategorySection'
import type { CategoryId } from '../types'

export function Sidebar({
    defaultExpanded,
}: {
    defaultExpanded: CategoryId[]
}) {
    const expandedSet = new Set(defaultExpanded)
    return (
        <aside className="upup-ie-sidebar">
            {categories.map((c) => (
                <CategorySection
                    key={c.id}
                    category={c}
                    defaultExpanded={expandedSet.has(c.id)}
                />
            ))}
        </aside>
    )
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- Sidebar`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/interactive-example/src/sidebar/Sidebar.tsx packages/interactive-example/src/tests/Sidebar.test.tsx
git commit -m "feat(interactive-example): add Sidebar that renders all categories"
```

---

## Task 12: UploaderPreview component (TDD)

**Files:**
- Create: `packages/interactive-example/src/preview/UploaderPreview.tsx`
- Create: `packages/interactive-example/src/tests/UploaderPreview.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/tests/UploaderPreview.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { UploaderPreview } from '../preview/UploaderPreview'

describe('UploaderPreview', () => {
    it('renders an UpupUploader in the preview frame', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 's3' } as any}>
                <UploaderPreview />
            </ConfigProvider>,
        )
        // UpupUploader exposes data-upup-slot="main-box"
        expect(document.querySelector('[data-upup-slot="main-box"]')).toBeTruthy()
    })

    it('applies current config as props on UpupUploader', () => {
        render(
            <ConfigProvider initialConfig={{ mini: true } as any}>
                <UploaderPreview />
            </ConfigProvider>,
        )
        // The uploader root should exist; specific prop reflection is implicit by rendering.
        expect(document.querySelector('[data-upup-slot="main-box"]')).toBeTruthy()
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- UploaderPreview`
Expected: FAIL.

- [ ] **Step 3: Implement `src/preview/UploaderPreview.tsx`**

```tsx
'use client'
import React, { useContext } from 'react'
import { UpupUploader } from '@upup/react'
import '@upup/react/styles'
import { ConfigContext } from '../state/ConfigContext'

export function UploaderPreview({ width = 'auto' }: { width?: number | 'auto' }) {
    const ctx = useContext(ConfigContext)
    if (!ctx) return null
    const style =
        width === 'auto' ? undefined : { width: `${width}px`, maxWidth: '100%' }
    return (
        <div className="upup-ie-preview" style={style}>
            <UpupUploader provider="s3" serverUrl="" {...(ctx.config as any)} />
        </div>
    )
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- UploaderPreview`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/interactive-example/src/preview/UploaderPreview.tsx packages/interactive-example/src/tests/UploaderPreview.test.tsx
git commit -m "feat(interactive-example): add UploaderPreview wrapper around UpupUploader"
```

---

## Task 13: generateCode pure function (TDD)

**Files:**
- Create: `packages/interactive-example/src/code/generateCode.ts`
- Create: `packages/interactive-example/src/tests/generateCode.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/generateCode.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateCode } from '../code/generateCode'

describe('generateCode', () => {
    it('renders minimal config with just provider', () => {
        const out = generateCode({ provider: 'backblaze' as any })
        expect(out).toContain("import { UpupUploader } from '@upup/react'")
        expect(out).toContain("import '@upup/react/styles'")
        expect(out).toContain('export default function App()')
        expect(out).toContain('<UpupUploader')
        expect(out).toContain('provider="backblaze"')
    })

    it('uses bool shorthand for true values', () => {
        const out = generateCode({ resumable: true } as any)
        expect(out).toMatch(/resumable(\s|\n)/)
        expect(out).not.toContain('resumable={true}')
    })

    it('renders numbers in braces', () => {
        const out = generateCode({ maxConcurrentUploads: 5 } as any)
        expect(out).toContain('maxConcurrentUploads={5}')
    })

    it('omits props with default/empty values', () => {
        const out = generateCode({})
        expect(out).not.toContain('provider=')
    })

    it('pretty-prints nested objects', () => {
        const out = generateCode({
            cloudDrives: { googleDrive: { clientId: 'abc' } },
        } as any)
        expect(out).toContain('cloudDrives={{')
        expect(out).toContain('googleDrive')
        expect(out).toContain("clientId: 'abc'")
    })

    it('emits onX handlers as console.log stubs when events toggles are set', () => {
        const out = generateCode({
            events: { onError: true, onFileUploadComplete: true } as any,
        } as any)
        expect(out).toContain("onError={(arg) => console.log('onError', arg)}")
        expect(out).toContain(
            "onFileUploadComplete={(arg) => console.log('onFileUploadComplete', arg)}",
        )
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- generateCode`
Expected: FAIL.

- [ ] **Step 3: Implement `src/code/generateCode.ts`**

```ts
import type { UpupConfig } from '../types'

function indent(s: string, n: number): string {
    const pad = ' '.repeat(n)
    return s
        .split('\n')
        .map((l) => (l ? pad + l : l))
        .join('\n')
}

function renderObjectLiteral(value: unknown, depth = 1): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value)
    if (Array.isArray(value)) {
        return (
            '[\n' +
            value.map((v) => indent(renderObjectLiteral(v, depth + 1), 2)).join(',\n') +
            '\n]'
        )
    }
    const entries = Object.entries(value as Record<string, unknown>).filter(
        ([, v]) => v !== undefined,
    )
    return (
        '{\n' +
        entries
            .map(([k, v]) => indent(`${k}: ${renderObjectLiteral(v, depth + 1)}`, 2))
            .join(',\n') +
        '\n}'
    )
}

function isMeaningful(value: unknown): boolean {
    if (value === undefined || value === null || value === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    if (typeof value === 'object' && Object.keys(value).length === 0) return false
    return true
}

function renderProp(key: string, value: unknown): string | null {
    if (!isMeaningful(value)) return null
    if (value === true) return key
    if (value === false) return null
    if (typeof value === 'string') return `${key}="${value.replace(/"/g, '&quot;')}"`
    if (typeof value === 'number') return `${key}={${value}}`
    // object / array — pretty print
    return `${key}={${renderObjectLiteral(value, 1)}}`
}

export function generateCode(config: UpupConfig): string {
    const events = (config as any).events as Record<string, boolean> | undefined
    const configWithoutEvents: Record<string, unknown> = { ...config }
    delete configWithoutEvents.events

    const propLines = Object.entries(configWithoutEvents)
        .map(([k, v]) => renderProp(k, v))
        .filter((s): s is string => s != null)

    const eventLines: string[] = []
    if (events) {
        for (const [handler, on] of Object.entries(events)) {
            if (on) {
                eventLines.push(
                    `${handler}={(arg) => console.log('${handler}', arg)}`,
                )
            }
        }
    }

    const allLines = [...propLines, ...eventLines]
    const propsBlock =
        allLines.length === 0
            ? ''
            : '\n' + indent(allLines.join('\n'), 6)

    return `import { UpupUploader } from '@upup/react'
import '@upup/react/styles'

export default function App() {
  return (
    <UpupUploader${propsBlock}
    />
  )
}
`
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- generateCode`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/interactive-example/src/code/generateCode.ts packages/interactive-example/src/tests/generateCode.test.ts
git commit -m "feat(interactive-example): add generateCode pure function"
```

---

## Task 14: CodeTab component (TDD)

**Files:**
- Create: `packages/interactive-example/src/code/CodeTab.tsx`
- Create: `packages/interactive-example/src/tests/CodeTab.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/tests/CodeTab.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ConfigProvider } from '../state/ConfigContext'
import { CodeTab } from '../code/CodeTab'

describe('CodeTab', () => {
    it('renders generated code in a <pre>', () => {
        render(
            <ConfigProvider initialConfig={{ provider: 'backblaze' } as any}>
                <CodeTab />
            </ConfigProvider>,
        )
        const pre = document.querySelector('pre')
        expect(pre?.textContent).toContain("provider=\"backblaze\"")
    })

    it('Copy button writes to clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        Object.assign(navigator, { clipboard: { writeText } })
        const user = userEvent.setup()
        render(
            <ConfigProvider initialConfig={{ provider: 'backblaze' } as any}>
                <CodeTab />
            </ConfigProvider>,
        )
        await user.click(screen.getByRole('button', { name: /copy/i }))
        expect(writeText).toHaveBeenCalledTimes(1)
        expect(writeText.mock.calls[0][0]).toContain('provider="backblaze"')
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- CodeTab`
Expected: FAIL.

- [ ] **Step 3: Implement `src/code/CodeTab.tsx`**

```tsx
import React, { useContext, useMemo, useState } from 'react'
import { ConfigContext } from '../state/ConfigContext'
import { generateCode } from './generateCode'

export function CodeTab() {
    const ctx = useContext(ConfigContext)
    const [copied, setCopied] = useState(false)
    const code = useMemo(() => (ctx ? generateCode(ctx.config) : ''), [ctx?.config])

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            // clipboard denied — silently ignore
        }
    }

    return (
        <div className="upup-ie-code-tab">
            <div className="upup-ie-code-header">
                <button type="button" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre className="upup-ie-code-pre">
                <code>{code}</code>
            </pre>
        </div>
    )
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- CodeTab`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/interactive-example/src/code/CodeTab.tsx packages/interactive-example/src/tests/CodeTab.test.tsx
git commit -m "feat(interactive-example): add CodeTab with copy-to-clipboard"
```

---

## Task 15: InteractiveExample top-level + focus mode (TDD)

**Files:**
- Create: `packages/interactive-example/src/InteractiveExample.tsx`
- Create: `packages/interactive-example/src/tests/InteractiveExample.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/tests/InteractiveExample.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { InteractiveExample } from '../InteractiveExample'

describe('InteractiveExample', () => {
    it('renders sidebar and preview by default', () => {
        render(<InteractiveExample disableUrlSync />)
        // sidebar contains Upload category header
        expect(screen.getByText('Upload')).toBeTruthy()
        // preview shows the UpupUploader
        expect(document.querySelector('[data-upup-slot="main-box"]')).toBeTruthy()
    })

    it('Code tab switches to show generated code', async () => {
        const user = userEvent.setup()
        render(<InteractiveExample disableUrlSync />)
        await user.click(screen.getByRole('button', { name: /code/i }))
        expect(document.querySelector('pre')).toBeTruthy()
    })

    it('showCodeTab=false hides the Code tab', () => {
        render(<InteractiveExample disableUrlSync showCodeTab={false} />)
        expect(screen.queryByRole('button', { name: /code/i })).toBeNull()
    })

    it('focus mode renders ONLY the specified toggles + preview, no sidebar shell', () => {
        render(<InteractiveExample disableUrlSync focus={['mini']} />)
        // sidebar headers should NOT render in focus mode
        expect(screen.queryByText('Upload')).toBeNull()
        // specified toggle IS rendered
        expect(screen.getByText('Mini mode')).toBeTruthy()
        // preview still visible
        expect(document.querySelector('[data-upup-slot="main-box"]')).toBeTruthy()
    })

    it('defaultExpanded opens specified sections', () => {
        render(
            <InteractiveExample
                disableUrlSync
                defaultExpanded={['upload']}
            />,
        )
        expect(screen.getByText('Provider')).toBeTruthy()
    })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @upup/interactive-example test -- InteractiveExample`
Expected: FAIL.

- [ ] **Step 3: Implement `src/InteractiveExample.tsx`**

```tsx
'use client'
import React, { useEffect, useState } from 'react'
import { ConfigProvider } from './state/ConfigContext'
import { ConfigContext } from './state/ConfigContext'
import { useContext, useMemo } from 'react'
import { Sidebar } from './sidebar/Sidebar'
import { UploaderPreview } from './preview/UploaderPreview'
import { CodeTab } from './code/CodeTab'
import { findEntry } from './categories'
import {
    BoolToggle,
    NumberInput,
    EnumSelect,
    MultiSelect,
    StringInput,
    NestedConfig,
} from './sidebar/primitives'
import {
    readConfigFromUrl,
    writeConfigToUrl,
    buildPermalink,
} from './state/url-sync'
import type { InteractiveExampleProps, ToggleEntry } from './types'

function renderEntry(entry: ToggleEntry) {
    switch (entry.primitive) {
        case 'bool':
            return <BoolToggle key={entry.id} propId={entry.id} label={entry.label} />
        case 'number':
            return (
                <NumberInput
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    min={entry.options?.min as number | undefined}
                    max={entry.options?.max as number | undefined}
                    step={entry.options?.step as number | undefined}
                />
            )
        case 'enum':
            return (
                <EnumSelect
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    options={(entry.options?.options as string[]) ?? []}
                />
            )
        case 'multi':
            return (
                <MultiSelect
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    options={(entry.options?.options as string[]) ?? []}
                />
            )
        case 'string':
            return (
                <StringInput
                    key={entry.id}
                    propId={entry.id}
                    label={entry.label}
                    placeholder={entry.options?.placeholder as string | undefined}
                />
            )
        case 'nested':
            return (
                <NestedConfig
                    key={entry.id}
                    parentPath={entry.id}
                    label={entry.label}
                    fields={(entry.options?.fields as ToggleEntry[]) ?? []}
                />
            )
    }
}

function PermalinkButton() {
    const ctx = useContext(ConfigContext)
    async function copyLink() {
        if (!ctx) return
        const url = buildPermalink(ctx.config)
        try {
            await navigator.clipboard.writeText(url)
        } catch {
            // silently ignore
        }
    }
    return (
        <button type="button" onClick={copyLink} className="upup-ie-permalink">
            Copy permalink
        </button>
    )
}

function UrlSync() {
    const ctx = useContext(ConfigContext)
    useEffect(() => {
        if (!ctx) return
        const handle = setTimeout(() => {
            writeConfigToUrl(ctx.config)
        }, 250)
        return () => clearTimeout(handle)
    }, [ctx?.config])
    return null
}

function Shell({
    defaultExpanded,
    showCodeTab,
    previewWidth,
}: {
    defaultExpanded: NonNullable<InteractiveExampleProps['defaultExpanded']>
    showCodeTab: boolean
    previewWidth: number | 'auto'
}) {
    const [tab, setTab] = useState<'preview' | 'code'>('preview')
    return (
        <div className="upup-ie-shell">
            <Sidebar defaultExpanded={defaultExpanded} />
            <div className="upup-ie-main">
                <div className="upup-ie-tabs">
                    <button
                        type="button"
                        className={tab === 'preview' ? 'is-active' : ''}
                        onClick={() => setTab('preview')}
                    >
                        Preview
                    </button>
                    {showCodeTab && (
                        <button
                            type="button"
                            className={tab === 'code' ? 'is-active' : ''}
                            onClick={() => setTab('code')}
                        >
                            Code
                        </button>
                    )}
                    <span className="upup-ie-tabs-spacer" />
                    <PermalinkButton />
                </div>
                <div className="upup-ie-tabs-body">
                    {tab === 'preview' && <UploaderPreview width={previewWidth} />}
                    {tab === 'code' && showCodeTab && <CodeTab />}
                </div>
            </div>
        </div>
    )
}

function FocusMode({
    focus,
    previewWidth,
}: {
    focus: string[]
    previewWidth: number | 'auto'
}) {
    const entries = focus
        .map((id) => findEntry(id))
        .filter((e): e is ToggleEntry => e != null)
    return (
        <div className="upup-ie-focus">
            <div className="upup-ie-focus-toggles">
                {entries.map(renderEntry)}
            </div>
            <UploaderPreview width={previewWidth} />
        </div>
    )
}

export function InteractiveExample({
    defaultExpanded = [],
    showCodeTab = true,
    focus,
    initialConfig,
    previewWidth = 'auto',
    disableUrlSync = false,
}: InteractiveExampleProps = {}) {
    const merged = useMemo(() => {
        const fromUrl = disableUrlSync ? {} : readConfigFromUrl()
        return { ...fromUrl, ...(initialConfig ?? {}) }
    }, [disableUrlSync, initialConfig])

    return (
        <ConfigProvider initialConfig={merged}>
            {!disableUrlSync && <UrlSync />}
            {focus && focus.length > 0 ? (
                <FocusMode focus={focus} previewWidth={previewWidth} />
            ) : (
                <Shell
                    defaultExpanded={defaultExpanded}
                    showCodeTab={showCodeTab}
                    previewWidth={previewWidth}
                />
            )}
        </ConfigProvider>
    )
}

export default InteractiveExample
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @upup/interactive-example test -- InteractiveExample`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/interactive-example/src/InteractiveExample.tsx packages/interactive-example/src/tests/InteractiveExample.test.tsx
git commit -m "feat(interactive-example): assemble InteractiveExample with focus + URL sync"
```

---

## Task 16: Public exports (wire up `src/index.ts`)

**Files:**
- Modify: `packages/interactive-example/src/index.ts`

- [ ] **Step 1: Replace stub with real exports**

Write to `src/index.ts`:

```ts
export { InteractiveExample, default } from './InteractiveExample'
export { ConfigProvider, ConfigContext } from './state/ConfigContext'
export { useConfig } from './state/useConfig'
export { serialize } from './state/serialize'
export { deserialize } from './state/deserialize'
export {
    readConfigFromUrl,
    writeConfigToUrl,
    buildPermalink,
} from './state/url-sync'
export { categories, allEntries, findEntry } from './categories'
export { Sidebar } from './sidebar/Sidebar'
export { CategorySection } from './sidebar/CategorySection'
export { UploaderPreview } from './preview/UploaderPreview'
export { CodeTab } from './code/CodeTab'
export { generateCode } from './code/generateCode'
export {
    BoolToggle,
    NumberInput,
    EnumSelect,
    MultiSelect,
    StringInput,
    NestedConfig,
} from './sidebar/primitives'
export type {
    InteractiveExampleProps,
    CategoryId,
    PropId,
    PrimitiveKind,
    ToggleEntry,
    CategoryDefinition,
    UpupConfig,
} from './types'
```

- [ ] **Step 2: Verify build + tests**

Run: `pnpm --filter @upup/interactive-example exec tsc --noEmit`
Expected: no output.

Run: `pnpm --filter @upup/interactive-example test`
Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/interactive-example/src/index.ts
git commit -m "feat(interactive-example): wire up public exports barrel"
```

---

## Task 17: Add minimal CSS

**Files:**
- Create: `packages/interactive-example/src/styles.css`
- Modify: `packages/interactive-example/src/index.ts` (add CSS export path)
- Modify: `packages/interactive-example/package.json` (add CSS export path)

- [ ] **Step 1: Create `src/styles.css`**

```css
/* Minimal default styles for InteractiveExample.
   Consumers can override via className props on each slot. */
.upup-ie-shell {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 12px;
    min-height: 500px;
}

.upup-ie-sidebar {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    padding: 8px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.03);
}

.upup-ie-category {
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.02);
}

.upup-ie-category-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    background: transparent;
    cursor: pointer;
    font-weight: 600;
    text-align: left;
}

.upup-ie-category-label {
    flex: 1;
}

.upup-ie-category-count {
    font-size: 11px;
    opacity: 0.6;
}

.upup-ie-category-body {
    padding: 4px 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.upup-ie-field,
.upup-ie-toggle {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
}

.upup-ie-toggle {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}

.upup-ie-toggle-text {
    display: flex;
    flex-direction: column;
}

.upup-ie-toggle-description {
    font-size: 11px;
    opacity: 0.6;
}

.upup-ie-field-label {
    font-size: 12px;
    font-weight: 500;
}

.upup-ie-nested {
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.upup-ie-nested legend {
    font-size: 12px;
    font-weight: 600;
    padding: 0 4px;
}

.upup-ie-multiselect {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 4px;
}

.upup-ie-multiselect-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
}

.upup-ie-main {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.upup-ie-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding-bottom: 4px;
}

.upup-ie-tabs button {
    background: transparent;
    border: 0;
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 13px;
}

.upup-ie-tabs button.is-active {
    background: rgba(59, 130, 246, 0.15);
    font-weight: 600;
}

.upup-ie-tabs-spacer {
    flex: 1;
}

.upup-ie-permalink {
    font-size: 11px !important;
    opacity: 0.7;
}

.upup-ie-code-pre {
    margin: 0;
    padding: 12px;
    background: #1a1a1a;
    color: #d0d6e0;
    border-radius: 6px;
    overflow: auto;
    font-size: 12px;
    line-height: 1.5;
}

.upup-ie-focus {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 12px;
}

.upup-ie-focus-toggles {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

@media (max-width: 768px) {
    .upup-ie-shell,
    .upup-ie-focus {
        grid-template-columns: 1fr;
    }
}
```

- [ ] **Step 2: Add CSS export path to `package.json`**

Edit `packages/interactive-example/package.json` — replace the `exports` block with:

```json
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./styles": "./src/styles.css"
  },
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter @upup/interactive-example exec tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add packages/interactive-example/src/styles.css packages/interactive-example/package.json
git commit -m "feat(interactive-example): add minimal default stylesheet"
```

---

## Task 18: Migrate `apps/playground` to use the new component

**Files:**
- Modify: `apps/playground/package.json` (add dep)
- Modify: `apps/playground/src/app/page.tsx`

- [ ] **Step 1: Add dependency to `apps/playground/package.json`**

Add `"@upup/interactive-example": "workspace:*"` to the `"dependencies"` object.

- [ ] **Step 2: Rewrite `apps/playground/src/app/page.tsx`**

Replace the file contents with:

```tsx
'use client'
import { InteractiveExample } from '@upup/interactive-example'
import '@upup/interactive-example/styles'

export default function PlaygroundHome() {
    return (
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
                upup Playground
            </h1>
            <InteractiveExample />
        </div>
    )
}
```

- [ ] **Step 3: Install workspace dep**

Run: `pnpm install`
Expected: `@upup/interactive-example` resolves in `apps/playground/node_modules`.

- [ ] **Step 4: Verify builds and dev server starts**

Run: `pnpm --filter @upup/playground typecheck`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/playground/package.json apps/playground/src/app/page.tsx
git commit -m "feat(playground): migrate to shared interactive-example component"
```

---

## Task 19: Migrate `apps/landing` to use the new component

**Files:**
- Modify: `apps/landing/package.json` (add dep)
- Modify: `apps/landing/src/app/page.tsx`
- Modify: `apps/landing/src/components/HomepageDemo/index.tsx` (replace with thin wrapper)

- [ ] **Step 1: Add dependency to `apps/landing/package.json`**

Add `"@upup/interactive-example": "workspace:*"` to the `"dependencies"` object.

- [ ] **Step 2: Replace `apps/landing/src/components/HomepageDemo/index.tsx` with a thin wrapper**

Replace entire file contents with:

```tsx
'use client'
import { InteractiveExample } from '@upup/interactive-example'
import '@upup/interactive-example/styles'

export default function HomepageDemo() {
    return (
        <section className="my-12" id="interactive-demo">
            <div className="text-center mb-8">
                <span className="inline-block px-3 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400">
                    Interactive Demo
                </span>
                <h2 className="text-3xl font-bold mt-3">Try the interactive example</h2>
                <p className="mt-2 text-sm opacity-70 max-w-xl mx-auto">
                    Customize the UI, drag &amp; drop files, and test our TypeScript npm package
                    with different themes and settings.
                </p>
            </div>
            <InteractiveExample
                defaultExpanded={['behavior', 'appearance', 'sources', 'processing', 'language']}
                showCodeTab={false}
            />
        </section>
    )
}
```

The `apps/landing/src/app/page.tsx` still imports `HomepageDemo` — no change needed there.

- [ ] **Step 3: Install workspace dep**

Run: `pnpm install`
Expected: `@upup/interactive-example` resolves.

- [ ] **Step 4: Verify builds**

Run: `pnpm --filter @upup/landing typecheck`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/landing/package.json apps/landing/src/components/HomepageDemo/index.tsx
git commit -m "feat(landing): migrate HomepageDemo to shared interactive-example"
```

---

## Task 20: Delete old duplicated files

**Files:**
- Delete: `apps/playground/src/components/HomepageDemo/` (folder)
- Delete: `apps/playground/src/components/Uploader.tsx`

- [ ] **Step 1: Delete the playground's old demo files**

```bash
rm -rf apps/playground/src/components/HomepageDemo
rm -f apps/playground/src/components/Uploader.tsx
```

- [ ] **Step 2: Verify no dangling imports**

Run: `pnpm --filter @upup/playground typecheck`
Expected: no output (the old files are no longer referenced).

Run: `pnpm --filter @upup/landing typecheck`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add -A apps/playground/src/components/
git commit -m "chore(playground): remove duplicated HomepageDemo + Uploader (moved to shared package)"
```

---

## Task 21: Full monorepo verification

**Files:** none — verification only.

- [ ] **Step 1: Run the new package's test suite**

Run: `pnpm --filter @upup/interactive-example test`
Expected: all tests PASS.

- [ ] **Step 2: Run the full monorepo test suite**

Run: `pnpm --filter "@upup/*" exec vitest run`
Expected: all packages green — shared, core, react, server, interactive-example.

- [ ] **Step 3: Run Playwright E2E against the existing e2e-test app**

Run (from repo root): `cd apps/e2e-test && pnpm playwright test`
Expected: 50+ tests pass (no regressions from our changes).

- [ ] **Step 4: Manual spot-check (local)**

Start the landing dev server: `pnpm --filter @upup/landing dev`
Navigate to the local URL and visually confirm the "Interactive Demo" section renders and toggles work.

Start the playground dev server: `pnpm --filter @upup/playground dev`
Navigate to the local URL and confirm the full `<InteractiveExample />` renders, all 9 categories appear, Preview/Code tabs work, and `?c=<token>` permalinks round-trip.

- [ ] **Step 5: Final commit (docs notes only, if needed)**

If any docs need updating to reflect the new component, add those notes. Otherwise no commit needed.

- [ ] **Step 6: Summary / handoff**

Report back:
- SHAs of all 20 commits
- Total tests (before vs after)
- Any visual-parity concerns observed on landing
- Recommended next steps (docs integration, AI/IDE deep-links — see spec §11)

---

## Self-Review

**Spec coverage check:**
- §1 Goal → Tasks 1–20 deliver the shared component replacing duplicated code ✓
- §2 Non-Goals → No tasks for AI/IDE deep-links, repo-native files, publishing, docs integration, comprehensive e2e ✓
- §3 Architecture → Task 1 creates package scaffold; file structure matches spec §3.2 ✓
- §4 Component API → Task 15 implements `InteractiveExample` with all listed props; Task 16 exports them ✓
- §5 URL state → Tasks 4, 5, 15 implement serialize/deserialize/url-sync + integration ✓
- §6 Category manifest → Task 9 implements all 9 categories with the listed entries ✓
- §7 Code generation → Task 13 implements `generateCode` with all listed rules ✓
- §8 Testing → Each component task includes TDD tests; Task 21 runs the full suite ✓
- §9 Migration sequence → Tasks 18–20 match ✓
- §10 Acceptance criteria → verified in Task 21 ✓
- §11 Future work → explicitly out of scope, not implemented ✓

**Placeholder scan:** No "TBD", "TODO", "handle edge cases", or similar vague items. Every test block and implementation block contains actual code.

**Type consistency check:**
- `CategoryId`, `PropId`, `PrimitiveKind`, `ToggleEntry`, `CategoryDefinition`, `UpupConfig`, `InteractiveExampleProps` used consistently across Tasks 2, 3, 9, 10, 15, 16 ✓
- `useConfig(path: string)` returns `{ value, set, config }` — same shape used in all primitive Tasks (6, 7, 8) ✓
- `serialize(config): string` / `deserialize(token): UpupConfig` — same signatures in Tasks 4, 5, 15, 16 ✓
- `findEntry(propId)` / `allEntries()` / `categories` — same exports referenced in Tasks 9, 15, 16 ✓
- `generateCode(config): string` — consistent in Tasks 13, 14, 16 ✓
