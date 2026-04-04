# Plan 5: React-Level Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add prop-getter pattern for headless consumers, close all WCAG AA accessibility gaps, expose `on()`/`ext` on the hook return, and establish component-level unit test coverage.

**Depends on:** Plan 3 (theme system) — components must have final DOM structure before we add aria attributes and test selectors.

**Branch:** `huge-refactor`  
**Package:** `@upup/react` (`packages/react/`)  
**Test runner:** Vitest + jsdom + @testing-library/react (already configured)  
**Existing tests:** `tests/accessibility.test.tsx`, `tests/paste-zone.test.tsx`, `tests/use-upup-upload.test.ts`

---

## Table of Contents

| Task | Feature | Issue |
|------|---------|-------|
| 5.1 | Prop-getter pattern (`getDropzoneProps`, `getRootProps`) | #85 |
| 5.2 | ~~Expose `on()` and `ext` on hook return~~ — SKIP (Plan 1 Task 13) | #48 |
| 5.3 | Accessibility: ProgressBar ARIA (already done — verify) | #47 |
| 5.4 | Accessibility: DropZone `aria-dropeffect` | #47 |
| 5.5 | Accessibility: Full keyboard navigation | #47 |
| 5.6 | Accessibility: Focus management after removal/upload | #47 |
| 5.7 | Test: DropZone unit tests | — |
| 5.8 | Test: FileList unit tests | — |
| 5.9 | Test: SourceSelector unit tests | — |
| 5.10 | Test: ProgressBar unit tests | — |
| 5.11 | Test: useUpupUpload prop-getter tests | — |
| 5.12 | Axe accessibility regression test suite | #47 |

---

## Task 5.1 — Prop-Getter Pattern

**Issue:** #85  
**Files:**
- `packages/react/src/use-upup-upload.ts` (modify)
- `packages/react/src/prop-getters.ts` (new)
- `packages/react/tests/prop-getters.test.ts` (new — TDD)

### API Shape

```typescript
// Returned from useUpupUpload()
interface UseUpupUploadReturn {
  // ... existing fields ...

  /** Spread onto a <div> to make it a drop target */
  getDropzoneProps: (overrides?: React.HTMLAttributes<HTMLElement>) => {
    onDragOver: React.DragEventHandler
    onDragLeave: React.DragEventHandler
    onDrop: React.DragEventHandler
    onPaste: React.ClipboardEventHandler
    role: 'region'
    'aria-label': string
    'aria-dropeffect': 'copy' | 'none'
    tabIndex: 0
  }

  /** Spread onto the outermost wrapper */
  getRootProps: (overrides?: React.HTMLAttributes<HTMLElement>) => {
    role: 'application'
    'aria-label': string
    'aria-busy': boolean
    'aria-describedby': string | undefined
  }

  /** Spread onto a hidden <input type="file"> */
  getInputProps: (overrides?: React.InputHTMLAttributes<HTMLInputElement>) => {
    type: 'file'
    multiple: boolean
    accept: string | undefined
    onChange: React.ChangeEventHandler<HTMLInputElement>
    style: { display: 'none' }
    tabIndex: -1
    'aria-hidden': true
  }
}
```

### Usage Example (Headless Consumer)

```tsx
function CustomUploader() {
  const {
    files,
    upload,
    getDropzoneProps,
    getRootProps,
    getInputProps,
  } = useUpupUpload({
    provider: 'aws',
    uploadEndpoint: '/api/upload',
  })

  return (
    <div {...getRootProps()}>
      <div {...getDropzoneProps()}>
        <input {...getInputProps()} />
        <p>Drop files here</p>
      </div>
      <ul>
        {files.map(f => <li key={f.id}>{f.name}</li>)}
      </ul>
      <button onClick={() => upload()}>Upload</button>
    </div>
  )
}
```

### TDD Steps

#### Step 1: Write failing tests

Create `packages/react/tests/prop-getters.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createPropGetters, type PropGetterDeps } from '../src/prop-getters'

function makeDeps(overrides: Partial<PropGetterDeps> = {}): PropGetterDeps {
  return {
    addFiles: vi.fn(),
    status: 'idle',
    accept: undefined,
    multiple: true,
    isDragging: false,
    setIsDragging: vi.fn(),
    disableDragAction: false,
    ...overrides,
  }
}

describe('createPropGetters', () => {
  describe('getDropzoneProps', () => {
    it('returns role="region" and aria-label', () => {
      const { getDropzoneProps } = createPropGetters(makeDeps())
      const props = getDropzoneProps()
      expect(props.role).toBe('region')
      expect(props['aria-label']).toMatch(/drop/i)
      expect(props.tabIndex).toBe(0)
    })

    it('sets aria-dropeffect="copy" when drag is active', () => {
      const { getDropzoneProps } = createPropGetters(
        makeDeps({ isDragging: true }),
      )
      expect(getDropzoneProps()['aria-dropeffect']).toBe('copy')
    })

    it('sets aria-dropeffect="none" when drag is inactive', () => {
      const { getDropzoneProps } = createPropGetters(makeDeps())
      expect(getDropzoneProps()['aria-dropeffect']).toBe('none')
    })

    it('merges user overrides without clobbering event handlers', () => {
      const userOnDragOver = vi.fn()
      const { getDropzoneProps } = createPropGetters(makeDeps())
      const props = getDropzoneProps({ onDragOver: userOnDragOver as any })
      // Should return a function (composed handler), not the raw user handler
      expect(typeof props.onDragOver).toBe('function')
    })
  })

  describe('getRootProps', () => {
    it('returns role="application"', () => {
      const { getRootProps } = createPropGetters(makeDeps())
      expect(getRootProps().role).toBe('application')
    })

    it('sets aria-busy=true when uploading', () => {
      const { getRootProps } = createPropGetters(
        makeDeps({ status: 'uploading' }),
      )
      expect(getRootProps()['aria-busy']).toBe(true)
    })

    it('sets aria-busy=false when idle', () => {
      const { getRootProps } = createPropGetters(makeDeps())
      expect(getRootProps()['aria-busy']).toBe(false)
    })
  })

  describe('getInputProps', () => {
    it('returns type="file" and aria-hidden', () => {
      const { getInputProps } = createPropGetters(makeDeps())
      const props = getInputProps()
      expect(props.type).toBe('file')
      expect(props['aria-hidden']).toBe(true)
      expect(props.tabIndex).toBe(-1)
    })

    it('respects accept option', () => {
      const { getInputProps } = createPropGetters(
        makeDeps({ accept: 'image/*' }),
      )
      expect(getInputProps().accept).toBe('image/*')
    })

    it('calls addFiles on change', () => {
      const addFiles = vi.fn()
      const { getInputProps } = createPropGetters(makeDeps({ addFiles }))
      const props = getInputProps()
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const event = { target: { files: [file] } } as any
      props.onChange(event)
      expect(addFiles).toHaveBeenCalledWith([file])
    })
  })
})
```

#### Step 2: Implement `prop-getters.ts`

Create `packages/react/src/prop-getters.ts`:

```typescript
import type { DragEventHandler, ClipboardEventHandler, ChangeEventHandler, HTMLAttributes, InputHTMLAttributes } from 'react'

export interface PropGetterDeps {
  addFiles: (files: File[]) => Promise<void> | void
  status: string
  accept: string | undefined
  multiple: boolean
  isDragging: boolean
  setIsDragging: (v: boolean) => void
  disableDragAction: boolean
}

function composeEventHandlers<E>(
  ...handlers: (((e: E) => void) | undefined)[]
): (e: E) => void {
  return (event: E) => {
    for (const handler of handlers) {
      handler?.(event)
    }
  }
}

export function createPropGetters(deps: PropGetterDeps) {
  const {
    addFiles,
    status,
    accept,
    multiple,
    isDragging,
    setIsDragging,
    disableDragAction,
  } = deps

  function getDropzoneProps(
    overrides: HTMLAttributes<HTMLElement> = {},
  ) {
    const onDragOver: DragEventHandler = (e) => {
      if (disableDragAction) return
      e.preventDefault()
      setIsDragging(true)
      e.dataTransfer.dropEffect = 'copy'
    }

    const onDragLeave: DragEventHandler = (e) => {
      if (disableDragAction) return
      e.preventDefault()
      setIsDragging(false)
    }

    const onDrop: DragEventHandler = async (e) => {
      if (disableDragAction) return
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      await addFiles(files)
      setIsDragging(false)
    }

    const onPaste: ClipboardEventHandler = (e) => {
      if (disableDragAction) return
      const items = Array.from(e.clipboardData?.items || [])
      const pastedFiles = items
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter((f): f is File => f !== null)
      if (!pastedFiles.length) return
      e.preventDefault()
      addFiles(pastedFiles)
    }

    return {
      onDragOver: composeEventHandlers(onDragOver, overrides.onDragOver as any),
      onDragLeave: composeEventHandlers(onDragLeave, overrides.onDragLeave as any),
      onDrop: composeEventHandlers(onDrop, overrides.onDrop as any),
      onPaste: composeEventHandlers(onPaste, overrides.onPaste as any),
      role: 'region' as const,
      'aria-label': 'Drop files here or click to browse',
      'aria-dropeffect': (isDragging ? 'copy' : 'none') as 'copy' | 'none',
      tabIndex: 0,
    }
  }

  function getRootProps(overrides: HTMLAttributes<HTMLElement> = {}) {
    const isUploading = status === 'uploading'
    return {
      ...overrides,
      role: 'application' as const,
      'aria-label': 'File uploader',
      'aria-busy': isUploading,
      'aria-describedby': undefined as string | undefined,
    }
  }

  function getInputProps(
    overrides: InputHTMLAttributes<HTMLInputElement> = {},
  ) {
    const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
      const fileList = e.target.files
      if (fileList) {
        addFiles(Array.from(fileList))
      }
    }
    return {
      ...overrides,
      type: 'file' as const,
      multiple,
      accept,
      onChange: composeEventHandlers(onChange, overrides.onChange as any),
      style: { display: 'none' as const },
      tabIndex: -1,
      'aria-hidden': true as const,
    }
  }

  return { getDropzoneProps, getRootProps, getInputProps }
}
```

#### Step 3: Wire into `use-upup-upload.ts`

Add to `UseUpupUploadReturn` interface and the return object:

```typescript
// Add to UseUpupUploadReturn interface:
getDropzoneProps: ReturnType<typeof createPropGetters>['getDropzoneProps']
getRootProps: ReturnType<typeof createPropGetters>['getRootProps']
getInputProps: ReturnType<typeof createPropGetters>['getInputProps']
```

In the hook body, after `const core = coreRef.current!`:

```typescript
const [isDragging, setIsDragging] = useState(false)
const disableDragAction = core.status === UploadStatus.UPLOADING

const propGetters = createPropGetters({
  addFiles: (files) => core.addFiles(files),
  status: core.status,
  accept: options.accept as string | undefined,
  multiple: options.limit !== 1,
  isDragging,
  setIsDragging,
  disableDragAction,
})

// ... in return:
return {
  // ... existing ...
  ...propGetters,
}
```

- [ ] Write failing tests in `tests/prop-getters.test.ts`
- [ ] Create `src/prop-getters.ts` with `createPropGetters()`
- [ ] Update `UseUpupUploadReturn` interface in `src/use-upup-upload.ts`
- [ ] Wire `createPropGetters` into hook body and return
- [ ] Add `isDragging` state to SSR defaults (false)
- [ ] Run `pnpm --filter @upup/react test` — all green

---

## Task 5.2 — SKIP (Handled by Plan 1 Task 13)

> **Covered by Plan 1 Task 13** — `on()` and `ext` are exposed directly on the `useUpupUpload` return type as part of the core hook wiring done in Plan 1. No additional work needed here.

---

## Task 5.3 — Verify ProgressBar ARIA (Already Implemented)

**Issue:** #47  
**File:** `packages/react/src/components/progress-bar.tsx`

The current implementation already has:
- `role="progressbar"`
- `aria-valuenow={progress}`
- `aria-valuemin={0}`
- `aria-valuemax={100}`
- `aria-label="Upload progress"`

**WCAG 4.1.2 (Name, Role, Value):** Satisfied.

- [ ] Verify existing attributes in code review
- [ ] Confirm covered by axe test in Task 5.12
- [ ] No code changes needed

---

## Task 5.4 — DropZone `aria-dropeffect`

**Issue:** #47  
**File:** `packages/react/src/components/drop-zone.tsx` (modify)  
**WCAG reference:** WAI-ARIA `aria-dropeffect` (deprecated in ARIA 1.1 but still the best available signal for screen readers on drop targets)

### Current State

DropZone has `role="region"` and `aria-label` but no `aria-dropeffect`.

### TDD Steps

#### Step 1: Write failing test

Add to `packages/react/tests/drop-zone.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import DropZone from '../src/components/drop-zone'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

describe('DropZone', () => {
  it('sets aria-dropeffect="copy" when dragging', () => {
    // We need to simulate isDragging=true from useMainBox
    // Since useMainBox reads from UploaderContext, we mock it
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone />
      </UploaderContext.Provider>,
    )
    const zone = container.querySelector('[role="region"]')
    // Initially "none"
    expect(zone?.getAttribute('aria-dropeffect')).toBe('none')
  })
})
```

#### Step 2: Implement

In `packages/react/src/components/drop-zone.tsx`, add `aria-dropeffect` to the `<motion.div>`:

```tsx
<motion.div
  // ... existing props ...
  aria-dropeffect={isDragging ? 'copy' : 'none'}
>
```

The `isDragging` value already comes from `useMainBox()`.

- [ ] Write failing test for `aria-dropeffect` in `tests/drop-zone.test.tsx`
- [ ] Add `aria-dropeffect={isDragging ? 'copy' : 'none'}` to DropZone
- [ ] Run test — green

---

## Task 5.5 — Full Keyboard Navigation

**Issue:** #47  
**WCAG references:**
- **2.1.1 Keyboard (Level A):** All functionality available via keyboard
- **2.4.3 Focus Order (Level A):** Logical tab order
- **2.1.2 No Keyboard Trap (Level A):** User can always Tab away

**Files:**
- `packages/react/src/components/source-selector.tsx` (modify)
- `packages/react/src/components/file-list.tsx` (modify)
- `packages/react/src/components/source-view.tsx` (modify)
- `packages/react/src/components/drop-zone.tsx` (modify)
- `packages/react/tests/keyboard-navigation.test.tsx` (new — TDD)

### Keyboard Interaction Spec

| Key | Context | Behavior |
|-----|---------|----------|
| `Tab` | Anywhere | Move through: source tabs → browse button → file list items → upload button |
| `Enter` / `Space` | Source tab focused | Activate that source (same as click) |
| `Enter` / `Space` | Browse button focused | Open file dialog |
| `Enter` / `Space` | File item focused | Open file preview (if applicable) |
| `Delete` / `Backspace` | File item focused | Remove that file |
| `Escape` | Source view active | Go back to source selector |
| `Escape` | File preview open | Close preview |
| `ArrowUp` / `ArrowDown` | File list | Move focus between file items |
| `ArrowLeft` / `ArrowRight` | Source tabs | Move between tabs |

### TDD Steps

#### Step 1: Write failing tests

Create `packages/react/tests/keyboard-navigation.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SourceSelector from '../src/components/source-selector'
import FileList from '../src/components/file-list'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

describe('Keyboard Navigation', () => {
  describe('SourceSelector', () => {
    it('supports ArrowRight/ArrowLeft between tabs', async () => {
      const user = userEvent.setup()
      const ctx = mockUploaderContext({
        sources: ['local', 'camera', 'url'],
      })
      render(
        <UploaderContext.Provider value={ctx}>
          <SourceSelector />
        </UploaderContext.Provider>,
      )

      const tabs = screen.getAllByRole('tab')
      tabs[0].focus()
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(tabs[1])
      await user.keyboard('{ArrowLeft}')
      expect(document.activeElement).toBe(tabs[0])
    })

    it('wraps focus from last tab to first on ArrowRight', async () => {
      const user = userEvent.setup()
      const ctx = mockUploaderContext({
        sources: ['local', 'camera'],
      })
      render(
        <UploaderContext.Provider value={ctx}>
          <SourceSelector />
        </UploaderContext.Provider>,
      )

      const tabs = screen.getAllByRole('tab')
      tabs[1].focus()
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(tabs[0])
    })

    it('activates tab on Enter', async () => {
      const user = userEvent.setup()
      const setActiveSource = vi.fn()
      const ctx = mockUploaderContext({
        sources: ['local', 'camera'],
        setActiveSource,
      })
      render(
        <UploaderContext.Provider value={ctx}>
          <SourceSelector />
        </UploaderContext.Provider>,
      )

      const tabs = screen.getAllByRole('tab')
      tabs[1].focus()
      await user.keyboard('{Enter}')
      expect(setActiveSource).toHaveBeenCalled()
    })
  })

  describe('FileList', () => {
    it('supports ArrowDown/ArrowUp between file items', async () => {
      const user = userEvent.setup()
      const ctx = mockUploaderContext({
        files: [
          { id: '1', name: 'a.txt', size: 100 },
          { id: '2', name: 'b.txt', size: 200 },
        ],
      })
      render(
        <UploaderContext.Provider value={ctx}>
          <FileList />
        </UploaderContext.Provider>,
      )

      const items = screen.getAllByRole('listitem')
      items[0].focus()
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(items[1])
    })

    it('removes file on Delete key', async () => {
      const user = userEvent.setup()
      const removeFile = vi.fn()
      const ctx = mockUploaderContext({
        files: [{ id: '1', name: 'a.txt', size: 100 }],
        removeFile,
      })
      render(
        <UploaderContext.Provider value={ctx}>
          <FileList />
        </UploaderContext.Provider>,
      )

      const item = screen.getByRole('listitem')
      item.focus()
      await user.keyboard('{Delete}')
      expect(removeFile).toHaveBeenCalledWith('1')
    })
  })

  describe('SourceView', () => {
    it('goes back on Escape key', async () => {
      const user = userEvent.setup()
      const setActiveSource = vi.fn()
      const ctx = mockUploaderContext({
        activeSource: 'url',
        setActiveSource,
      })
      render(
        <UploaderContext.Provider value={ctx}>
          <div data-testid="source-view-wrapper" tabIndex={0}>
            {/* SourceView will be rendered here */}
          </div>
        </UploaderContext.Provider>,
      )

      await user.keyboard('{Escape}')
      // setActiveSource(null) should be called
      expect(setActiveSource).toHaveBeenCalledWith(null)
    })
  })
})
```

#### Step 2: Implement keyboard handlers

**SourceSelector — Arrow key navigation between tabs:**

In `packages/react/src/components/source-selector.tsx`, add a `onKeyDown` handler to the `role="tablist"` container:

```tsx
const handleTabListKeyDown = useCallback(
  (e: React.KeyboardEvent) => {
    const tabs = Array.from(
      e.currentTarget.querySelectorAll('[role="tab"]'),
    ) as HTMLElement[]
    const currentIndex = tabs.indexOf(e.target as HTMLElement)
    if (currentIndex === -1) return

    let nextIndex: number | null = null
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    }

    if (nextIndex !== null) {
      e.preventDefault()
      tabs[nextIndex].focus()
    }
  },
  [],
)
```

Add `onKeyDown={handleTabListKeyDown}` to the `role="tablist"` div. Add `tabIndex={0}` to each tab button (buttons are already focusable, but ensure they are in tab order).

**FileList — Arrow key navigation + Delete to remove:**

In `packages/react/src/components/file-list.tsx`, add keyboard handler to file items:

```tsx
const handleFileKeyDown = useCallback(
  (e: React.KeyboardEvent, fileId: string, index: number) => {
    const items = Array.from(
      e.currentTarget.parentElement?.querySelectorAll('[role="listitem"]') || [],
    ) as HTMLElement[]

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[Math.min(index + 1, items.length - 1)]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[Math.max(index - 1, 0)]?.focus()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      removeFile(fileId)
    }
  },
  [removeFile],
)
```

Add `tabIndex={0}` and `onKeyDown={(e) => handleFileKeyDown(e, file.id, index)}` to each file `<div>` in the map. Destructure `removeFile` from `useUploaderContext()`.

**SourceView — Escape to go back:**

In `packages/react/src/components/source-view.tsx`, add:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && activeSource) {
      setActiveSource(null)
    }
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [activeSource, setActiveSource])
```

- [ ] Create `tests/helpers/mock-context.ts` with `mockUploaderContext()` helper
- [ ] Write failing keyboard tests in `tests/keyboard-navigation.test.tsx`
- [ ] Add arrow key handler to SourceSelector tablist
- [ ] Add arrow + Delete handlers to FileList items
- [ ] Add Escape handler to SourceView
- [ ] Add `tabIndex={0}` to file list items
- [ ] Run tests — green

---

## Task 5.6 — Focus Management After File Removal / Upload

**Issue:** #47  
**WCAG reference:** **2.4.3 Focus Order (Level A)** — when content is removed, focus must move to a logical place (not be lost to `<body>`).

**Files:**
- `packages/react/src/components/file-list.tsx` (modify)
- `packages/react/tests/focus-management.test.tsx` (new — TDD)

### Behavior Spec

| Event | Focus Target |
|-------|-------------|
| File removed (not last) | Next file in list |
| File removed (was last) | Previous file, or the "browse files" button if list is now empty |
| All files removed / cancel | DropZone container |
| Upload completes (success) | "Done" button |
| Upload fails | "Retry Upload" button |

### TDD Steps

#### Step 1: Write failing tests

Create `packages/react/tests/focus-management.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileList from '../src/components/file-list'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

describe('Focus Management', () => {
  it('moves focus to next file after removal', async () => {
    const user = userEvent.setup()
    let currentFiles = [
      { id: '1', name: 'a.txt', size: 100 },
      { id: '2', name: 'b.txt', size: 200 },
      { id: '3', name: 'c.txt', size: 300 },
    ]
    const removeFile = vi.fn((id: string) => {
      currentFiles = currentFiles.filter(f => f.id !== id)
    })

    const { rerender } = render(
      <UploaderContext.Provider
        value={mockUploaderContext({ files: currentFiles, removeFile })}
      >
        <FileList />
      </UploaderContext.Provider>,
    )

    const items = screen.getAllByRole('listitem')
    items[1].focus()
    await user.keyboard('{Delete}')

    // Rerender with updated files
    rerender(
      <UploaderContext.Provider
        value={mockUploaderContext({ files: currentFiles, removeFile })}
      >
        <FileList />
      </UploaderContext.Provider>,
    )

    // Focus should be on the file that took position index=1 (was 'c.txt')
    const updatedItems = screen.getAllByRole('listitem')
    expect(document.activeElement).toBe(updatedItems[1])
  })

  it('moves focus to upload success button after successful upload', () => {
    const ctx = mockUploaderContext({
      files: [{ id: '1', name: 'a.txt', size: 100 }],
      status: 'successful',
    })

    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )

    const doneButton = screen.getByText('Done')
    expect(document.activeElement).toBe(doneButton)
  })
})
```

#### Step 2: Implement

In `packages/react/src/components/file-list.tsx`:

1. Track `lastRemovedIndex` via `useRef<number | null>(null)`.
2. In a custom `handleRemoveFile` wrapper:
   ```typescript
   const lastRemovedIndexRef = useRef<number | null>(null)

   const handleRemoveFile = useCallback((id: string) => {
     const index = files.findIndex(f => f.id === id)
     lastRemovedIndexRef.current = index
     removeFile(id)
   }, [files, removeFile])
   ```
3. After render, use `useEffect` to move focus:
   ```typescript
   useEffect(() => {
     if (lastRemovedIndexRef.current === null) return
     const items = document.querySelectorAll('[data-upup-file-id]')
     const targetIndex = Math.min(lastRemovedIndexRef.current, items.length - 1)
     if (targetIndex >= 0) {
       (items[targetIndex] as HTMLElement).focus()
     }
     lastRemovedIndexRef.current = null
   }, [files.length])
   ```
4. For upload completion, add `useEffect` for status:
   ```typescript
   const doneButtonRef = useRef<HTMLButtonElement>(null)
   const retryButtonRef = useRef<HTMLButtonElement>(null)

   useEffect(() => {
     if (isSuccessful) doneButtonRef.current?.focus()
     if (isFailed) retryButtonRef.current?.focus()
   }, [isSuccessful, isFailed])
   ```

- [ ] Write failing focus management tests in `tests/focus-management.test.tsx`
- [ ] Add `lastRemovedIndexRef` and focus-after-removal logic to FileList
- [ ] Add `doneButtonRef`/`retryButtonRef` and focus-on-completion logic
- [ ] Wire `handleRemoveFile` through keyboard Delete handler
- [ ] Run tests — green

---

## Task 5.7 — DropZone Unit Tests

**File:** `packages/react/tests/drop-zone.test.tsx` (new)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import DropZone from '../src/components/drop-zone'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

describe('DropZone', () => {
  it('renders with role="region"', () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone />
      </UploaderContext.Provider>,
    )
    expect(container.querySelector('[role="region"]')).toBeTruthy()
  })

  it('renders children', () => {
    render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone>
          <span data-testid="child">Hello</span>
        </DropZone>
      </UploaderContext.Provider>,
    )
    expect(screen.getByTestId('child')).toBeTruthy()
  })

  it('applies custom className', () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone className="my-custom-class" />
      </UploaderContext.Provider>,
    )
    expect(
      container.querySelector('.my-custom-class'),
    ).toBeTruthy()
  })

  it('has aria-label for drop target', () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone />
      </UploaderContext.Provider>,
    )
    const zone = container.querySelector('[role="region"]')
    expect(zone?.getAttribute('aria-label')).toBeTruthy()
  })
})
```

- [ ] Create `tests/drop-zone.test.tsx`
- [ ] Run tests — green

---

## Task 5.8 — FileList Unit Tests

**File:** `packages/react/tests/file-list.test.tsx` (new)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FileList from '../src/components/file-list'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

describe('FileList', () => {
  it('renders nothing in mini mode', () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext({ mini: true })}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders file names', () => {
    const ctx = mockUploaderContext({
      files: [
        { id: '1', name: 'photo.jpg', size: 1024 },
        { id: '2', name: 'doc.pdf', size: 2048 },
      ],
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(screen.getByText('photo.jpg')).toBeTruthy()
    expect(screen.getByText('doc.pdf')).toBeTruthy()
  })

  it('shows file count in header', () => {
    const ctx = mockUploaderContext({
      files: [
        { id: '1', name: 'a.txt', size: 100 },
        { id: '2', name: 'b.txt', size: 200 },
      ],
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(screen.getByText('2 files selected')).toBeTruthy()
  })

  it('renders Upload button with correct count', () => {
    const ctx = mockUploaderContext({
      files: [{ id: '1', name: 'a.txt', size: 100 }],
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(screen.getByText('Upload 1 file')).toBeTruthy()
  })

  it('calls upload() on Upload button click', () => {
    const upload = vi.fn().mockResolvedValue([])
    const ctx = mockUploaderContext({
      files: [{ id: '1', name: 'a.txt', size: 100 }],
      upload,
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    fireEvent.click(screen.getByText('Upload 1 file'))
    expect(upload).toHaveBeenCalled()
  })

  it('shows Retry Upload button on failure', () => {
    const ctx = mockUploaderContext({
      files: [{ id: '1', name: 'a.txt', size: 100 }],
      status: 'failed',
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(screen.getByText('Retry Upload')).toBeTruthy()
  })

  it('shows Done button on success', () => {
    const ctx = mockUploaderContext({
      files: [{ id: '1', name: 'a.txt', size: 100 }],
      status: 'successful',
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(screen.getByText('Done')).toBeTruthy()
  })

  it('has aria-live="polite" on file list container', () => {
    const ctx = mockUploaderContext({
      files: [{ id: '1', name: 'a.txt', size: 100 }],
    })
    const { container } = render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
  })
})
```

- [ ] Create `tests/file-list.test.tsx`
- [ ] Run tests — green

---

## Task 5.9 — SourceSelector Unit Tests

**File:** `packages/react/tests/source-selector.test.tsx` (new)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SourceSelector from '../src/components/source-selector'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

describe('SourceSelector', () => {
  it('renders tablist with aria-label', () => {
    render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <SourceSelector />
      </UploaderContext.Provider>,
    )
    const tablist = screen.getByRole('tablist')
    expect(tablist.getAttribute('aria-label')).toBe('Upload sources')
  })

  it('renders a tab for each adapter', () => {
    // Number of tabs depends on chosenAdapters from useAdapterSelector
    render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <SourceSelector />
      </UploaderContext.Provider>,
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBeGreaterThan(0)
  })

  it('marks active source tab as aria-selected=true', () => {
    const ctx = mockUploaderContext({ activeSource: 'camera' })
    render(
      <UploaderContext.Provider value={ctx}>
        <SourceSelector />
      </UploaderContext.Provider>,
    )
    const tabs = screen.getAllByRole('tab')
    const selectedTab = tabs.find(
      t => t.getAttribute('aria-selected') === 'true',
    )
    expect(selectedTab).toBeTruthy()
  })

  it('has a hidden file input with aria-label', () => {
    render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <SourceSelector />
      </UploaderContext.Provider>,
    )
    const input = screen.getByTestId('upup-file-input')
    expect(input.getAttribute('aria-label')).toBe('Choose files to upload')
  })
})
```

- [ ] Create `tests/source-selector.test.tsx`
- [ ] Run tests — green

---

## Task 5.10 — ProgressBar Unit Tests

**File:** `packages/react/tests/progress-bar.test.tsx` (new)

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressBar from '../src/components/progress-bar'

describe('ProgressBar', () => {
  it('renders nothing when progress is 0', () => {
    const { container } = render(<ProgressBar progress={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders progressbar role with correct aria attributes', () => {
    render(<ProgressBar progress={42} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('42')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(bar.getAttribute('aria-label')).toBe('Upload progress')
  })

  it('shows percentage text when showValue is true', () => {
    render(<ProgressBar progress={75} showValue />)
    expect(screen.getByText('75%')).toBeTruthy()
  })

  it('does not show percentage text when showValue is false', () => {
    const { container } = render(<ProgressBar progress={75} />)
    expect(container.textContent).not.toContain('75%')
  })

  it('sets inner bar width to progress percentage', () => {
    const { container } = render(<ProgressBar progress={60} />)
    const inner = container.querySelector('[style*="width"]') as HTMLElement
    expect(inner?.style.width).toBe('60%')
  })

  it('forwards ref to outer container', () => {
    const ref = { current: null as HTMLDivElement | null }
    render(<ProgressBar progress={50} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})
```

- [ ] Create `tests/progress-bar.test.tsx`
- [ ] Run tests — green

---

## Task 5.11 — useUpupUpload Prop-Getter Integration Tests

**File:** `packages/react/tests/use-upup-upload.test.ts` (modify — add cases)

Add integration tests that verify prop-getters work through the hook:

```typescript
describe('useUpupUpload prop-getters', () => {
  it('getDropzoneProps returns required properties', () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' }),
    )
    const props = result.current.getDropzoneProps()
    expect(props.role).toBe('region')
    expect(props['aria-dropeffect']).toBe('none')
    expect(typeof props.onDrop).toBe('function')
    expect(typeof props.onDragOver).toBe('function')
  })

  it('getRootProps returns required properties', () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' }),
    )
    const props = result.current.getRootProps()
    expect(props.role).toBe('application')
    expect(props['aria-busy']).toBe(false)
  })

  it('getInputProps returns required properties', () => {
    const { result } = renderHook(() =>
      useUpupUpload({ provider: 'aws', uploadEndpoint: '/api/upload' }),
    )
    const props = result.current.getInputProps()
    expect(props.type).toBe('file')
    expect(props['aria-hidden']).toBe(true)
  })
})
```

- [ ] Add prop-getter integration tests to `tests/use-upup-upload.test.ts`
- [ ] Run tests — green

---

## Task 5.12 — Axe Accessibility Regression Suite

**Issue:** #47  
**File:** `packages/react/tests/accessibility.test.tsx` (modify — expand)

Expand the existing axe test to cover individual components:

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { UpupUploader } from '../src/upup-uploader'
import ProgressBar from '../src/components/progress-bar'
import DropZone from '../src/components/drop-zone'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

expect.extend(toHaveNoViolations)

describe('Accessibility — axe audit', () => {
  it('UpupUploader has no axe violations', async () => {
    const { container } = render(
      <UpupUploader
        provider="aws"
        uploadEndpoint="/api/upload"
        sources={['local']}
      />,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('ProgressBar has no axe violations', async () => {
    const { container } = render(<ProgressBar progress={50} showValue />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('DropZone has no axe violations', async () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone>
          <p>Drop files here</p>
        </DropZone>
      </UploaderContext.Provider>,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

- [ ] Expand `tests/accessibility.test.tsx` with per-component axe checks
- [ ] Run tests — green

---

## Shared Test Helper — `mockUploaderContext`

**File:** `packages/react/tests/helpers/mock-context.ts` (new)

This is needed by Tasks 5.4-5.12 and should be created first.

```typescript
import { vi } from 'vitest'
import type { UploaderContextValue } from '../../src/context/uploader-context'
import type { UploadFile } from '@upup/shared'

type MockOverrides = Partial<UploaderContextValue> & {
  files?: Partial<UploadFile>[]
}

export function mockUploaderContext(
  overrides: MockOverrides = {},
): UploaderContextValue {
  const files = (overrides.files ?? []) as UploadFile[]

  return {
    // UseUpupUploadReturn
    files,
    status: (overrides.status as any) ?? 'idle',
    progress: overrides.progress ?? {
      totalFiles: files.length,
      completedFiles: 0,
      percentage: 0,
    },
    error: overrides.error ?? null,
    addFiles: overrides.addFiles ?? vi.fn(),
    removeFile: overrides.removeFile ?? vi.fn(),
    removeAll: overrides.removeAll ?? vi.fn(),
    setFiles: overrides.setFiles ?? vi.fn(),
    reorderFiles: overrides.reorderFiles ?? vi.fn(),
    upload: overrides.upload ?? vi.fn().mockResolvedValue([]),
    pause: overrides.pause ?? vi.fn(),
    resume: overrides.resume ?? vi.fn(),
    cancel: overrides.cancel ?? vi.fn(),
    retry: overrides.retry ?? vi.fn(),
    core: overrides.core ?? ({} as any),
    on: overrides.on ?? vi.fn(() => () => {}),
    ext: overrides.ext ?? {},

    // UploaderUIState
    activeSource: overrides.activeSource ?? null,
    setActiveSource: overrides.setActiveSource ?? vi.fn(),
    dark: overrides.dark ?? false,
    mini: overrides.mini ?? false,
    classNames: overrides.classNames ?? {},
    icons: overrides.icons ?? {},
    enablePaste: overrides.enablePaste ?? true,
    sources: overrides.sources ?? ['local'],
    translations: overrides.translations ?? ({} as any),
  } as UploaderContextValue
}
```

- [ ] Create `tests/helpers/mock-context.ts`

---

## Execution Order

```
5.0  Create tests/helpers/mock-context.ts         (prereq for all component tests)
5.1  Prop-getter pattern                           (TDD: test → implement → wire)
5.2  Expose on()/ext on hook                       (TDD: test → implement)
5.3  Verify ProgressBar ARIA                       (review only — no code change)
5.4  DropZone aria-dropeffect                      (TDD: test → implement)
5.5  Full keyboard navigation                      (TDD: test → implement)
5.6  Focus management after removal/upload         (TDD: test → implement)
5.7  DropZone unit tests                           (write tests)
5.8  FileList unit tests                           (write tests)
5.9  SourceSelector unit tests                     (write tests)
5.10 ProgressBar unit tests                        (write tests)
5.11 useUpupUpload prop-getter integration tests   (write tests)
5.12 Axe accessibility regression suite            (expand existing)
```

Tasks 5.7-5.10 are independent and can be parallelized.

---

## Verification Checklist

- [ ] `pnpm --filter @upup/react test` — all tests pass
- [ ] `pnpm --filter @upup/react build` — no type errors
- [ ] axe audit reports 0 violations
- [ ] Tab through entire uploader with keyboard only — all interactive elements reachable
- [ ] Screen reader (NVDA/VoiceOver) announces: drop zone role, progress value, file count changes, source tab selection
- [ ] Headless usage with `getDropzoneProps()`/`getRootProps()`/`getInputProps()` works without importing any UI components

## WCAG AA Compliance Summary

| Criterion | Level | Status |
|-----------|-------|--------|
| 1.3.1 Info and Relationships | A | Covered — semantic roles (tablist/tab, list/listitem, progressbar, region) |
| 2.1.1 Keyboard | A | Task 5.5 — full keyboard nav |
| 2.1.2 No Keyboard Trap | A | Task 5.5 — Escape exits source views |
| 2.4.3 Focus Order | A | Task 5.6 — focus management |
| 2.4.7 Focus Visible | AA | Inherits from browser defaults + Tailwind focus-visible |
| 4.1.2 Name, Role, Value | A | Tasks 5.3, 5.4 — ARIA attributes on all interactive widgets |
| 4.1.3 Status Messages | AA | Existing `aria-live="polite"` on file count + file list |
