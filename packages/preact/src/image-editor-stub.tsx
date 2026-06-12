/**
 * Parity stub: react-filerobot-image-editor is a React-only heavy dependency
 * (react-konva / konva / styled-components). It is NOT shipped in the Preact
 * compat build. The tsup esbuild alias map rewrites every dynamic
 * `import('react-filerobot-image-editor')` to this module instead.
 *
 * Shape mirrors the consumed surface from:
 *   - packages/react/src/components/ImageEditorInline.tsx
 *   - packages/react/src/components/ImageEditorModal.tsx
 *
 * Both files do:
 *   const [mod, scMod] = await Promise.all([
 *     import('react-filerobot-image-editor'),          // ← aliased here
 *     import('styled-components').catch(() => null),  // ← already guarded, no stub
 *   ])
 *   mod.default             → ComponentType (the editor component)
 *   mod.TABS                → Record<string,unknown>; TABS.ADJUST used as defaultTabId
 *                             TABS[tab.toUpperCase()] used for resolvedTabs mapping
 *   mod.TOOLS               → Record<string,unknown>; stored in state, sub-keys forwarded
 *
 * All sub-key accesses use optional-chaining or null-checks in the consumer
 * (e.g. `editorConstants?.TABS`, `TABS.ADJUST ?? tab`) so plain empty objects
 * are safe. The sub-keys below document the known filerobot API surface and
 * resolve to undefined rather than throwing.
 */

// ── default export: no-op editor component ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ImageEditorStub(_props?: any): null {
  return null
}

// ── TABS: known tab identifiers from filerobot's public API ───────────────
// The react components read: TABS.ADJUST (defaultTabId) and
// TABS[tab.toUpperCase()] for tab list mapping.
// Empty object is safe: accesses return `undefined`, consumers guard with `?? tab`.
export const TABS: Record<string, unknown> = {
  ADJUST: 'ADJUST',
  ANNOTATE: 'ANNOTATE',
  FINETUNE: 'FINETUNE',
  FILTERS: 'FILTERS',
  RESIZE: 'RESIZE',
  WATERMARK: 'WATERMARK',
}

// ── TOOLS: known tool identifiers from filerobot's public API ─────────────
// Stored in editorConstants.TOOLS state; sub-keys may be forwarded as
// `defaultToolId` in future callers. Empty object is safe; entries documented
// for parity with the real filerobot surface.
export const TOOLS: Record<string, unknown> = {
  CROP: 'CROP',
  ROTATE: 'ROTATE',
  FLIP_X: 'FLIP_X',
  FLIP_Y: 'FLIP_Y',
  BRIGHTNESS: 'BRIGHTNESS',
  CONTRAST: 'CONTRAST',
  HSL: 'HSL',
  BLUR: 'BLUR',
  PENCIL: 'PENCIL',
  LINE: 'LINE',
  ARROW: 'ARROW',
  RECT: 'RECT',
  ELLIPSE: 'ELLIPSE',
  TEXT: 'TEXT',
  POLYGON: 'POLYGON',
  WATERMARK: 'WATERMARK',
}
