export interface NormalizedNode {
  tag: string
  testid?: string
  slot?: string
  role?: string
  tabindex?: string
  type?: string
  ariaHidden?: string
  aria?: Record<string, string>
  classes: string[]
  children: NormalizedNode[]
}

/**
 * Walk `el` and return its normalized tree: only the shared design-system
 * contract (structure, stable data-testid / data-upup-slot hooks, a11y attrs,
 * and `upup-`-prefixed class tokens). Everything framework-injected is stripped.
 *
 * Rules:
 *  - skip any element with the `upup-hidden` class (display:none ⇒ not visual/a11y plumbing)
 *  - `<svg>` is a leaf: keep its `upup-` classes, do NOT recurse into glyph internals
 *  - skip non-element nodes (text/comment) — structure only
 *
 * MUST be self-contained (serialized into the page by page.$eval).
 */
export function normalizeElement(el: Element): NormalizedNode {
  const isUpupHidden = (node: Element) =>
    node.classList.contains('upup-hidden')

  const norm = (node: Element): NormalizedNode | null => {
    if (isUpupHidden(node)) return null

    const tag = node.tagName.toLowerCase()

    const classes = Array.from(node.classList)
      .filter((c) => c.startsWith('upup-'))
      .sort()

    const out: NormalizedNode = { tag, classes, children: [] }

    const testid = node.getAttribute('data-testid')
    if (testid) out.testid = testid
    const slot = node.getAttribute('data-upup-slot')
    if (slot) out.slot = slot
    const role = node.getAttribute('role')
    if (role) out.role = role
    const tabindex = node.getAttribute('tabindex')
    if (tabindex !== null) out.tabindex = String(tabindex)
    const type = node.getAttribute('type')
    if (type) out.type = type
    const ariaHidden = node.getAttribute('aria-hidden')
    if (ariaHidden !== null) out.ariaHidden = ariaHidden

    const aria: Record<string, string> = {}
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.startsWith('aria-') && attr.name !== 'aria-hidden') {
        aria[attr.name] = attr.value
      }
    }
    const ariaKeys = Object.keys(aria).sort()
    if (ariaKeys.length) {
      out.aria = {}
      for (const k of ariaKeys) out.aria[k] = aria[k]
    }

    // <svg> is a leaf — its internals are glyph data, verified elsewhere.
    if (tag === 'svg') return out

    for (const child of Array.from(node.children)) {
      const normalized = norm(child)
      if (normalized) out.children.push(normalized)
    }
    return out
  }

  // The root itself is assumed not to be upup-hidden.
  return norm(el) as NormalizedNode
}
