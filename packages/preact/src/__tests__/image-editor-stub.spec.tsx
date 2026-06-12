/**
 * Tests that the image-editor-stub exports the exact shape that
 * packages/react/src/components/ImageEditorInline.tsx and
 * packages/react/src/components/ImageEditorModal.tsx destructure from
 * `react-filerobot-image-editor`.
 *
 * Both consumers do:
 *   const [mod] = await Promise.all([import('react-filerobot-image-editor'), ...])
 *   mod.default     → called as a ComponentType
 *   mod.TABS        → Record<string,unknown>; TABS.ADJUST used as defaultTabId
 *                     TABS[tab.toUpperCase()] used for resolvedTabs mapping
 *   mod.TOOLS       → Record<string,unknown>; stored in state / forwarded
 *
 * styled-components is guarded with .catch(() => null) — no stub needed.
 */

import { expect, test } from 'vitest'
import Stub, * as mod from '../image-editor-stub'

// ── default export ─────────────────────────────────────────────────────────

test('stub default export is a renderable component returning null', () => {
  expect(typeof Stub).toBe('function')
  // Called with empty props — simulates the lazy path rendering the editor.
  expect(Stub({})).toBeNull()
})

// ── named exports (TABS + TOOLS) ───────────────────────────────────────────

test('stub provides every named binding the react editor destructures', () => {
  // Both ImageEditorInline + ImageEditorModal read mod.TABS and mod.TOOLS.
  expect(mod.TABS).toBeDefined()
  expect(mod.TOOLS).toBeDefined()

  // Both are plain objects (not null / undefined), so optional-chaining works.
  expect(typeof mod.TABS).toBe('object')
  expect(typeof mod.TOOLS).toBe('object')
})

test('TABS.ADJUST resolves without throwing (used as defaultTabId in both editors)', () => {
  // ImageEditorInline.tsx line:
  //   defaultTabId={editorConstants?.TABS ? editorConstants.TABS.ADJUST : undefined}
  // ImageEditorModal.tsx same pattern.
  // Must not throw; value may be a string or undefined — consumer guards with `?? tab`.
  expect(() => mod.TABS.ADJUST).not.toThrow()
})

test('TABS[tab.toUpperCase()] pattern does not throw for known filerobot tab names', () => {
  // resolvedTabs = editorConfig.tabs?.map(tab => TABS[tab.toUpperCase()] ?? tab)
  // These are the tab identifiers filerobot ships by default.
  const knownTabs = ['ADJUST', 'ANNOTATE', 'FINETUNE', 'FILTERS', 'RESIZE', 'WATERMARK']
  for (const key of knownTabs) {
    expect(() => mod.TABS[key]).not.toThrow()
    // Values are either the stub string or undefined — both are fine; consumer uses ?? fallback.
  }
})

test('TOOLS sub-keys do not throw on access (forwarded as defaultToolId / tabsIds)', () => {
  // TOOLS is stored in editorConstants.TOOLS and may be forwarded in future callers.
  const knownTools = ['CROP', 'ROTATE', 'FLIP_X', 'FLIP_Y', 'BRIGHTNESS', 'CONTRAST', 'TEXT']
  for (const key of knownTools) {
    expect(() => mod.TOOLS[key]).not.toThrow()
  }
})

test('TABS and TOOLS are plain objects (not null, array, or class instances)', () => {
  // Consumers spread / index them; they must be plain records.
  expect(Array.isArray(mod.TABS)).toBe(false)
  expect(Array.isArray(mod.TOOLS)).toBe(false)
  expect(mod.TABS).not.toBeNull()
  expect(mod.TOOLS).not.toBeNull()
})
