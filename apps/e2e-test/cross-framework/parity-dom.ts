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
 *  - unwrap "transparent component hosts": a custom-element (hyphenated tag) that
 *    carries no `upup-` classes and no semantic hooks (testid/slot/role/tabindex/
 *    aria/type). Angular renders its components as such host elements (e.g.
 *    `<upup-icon>` wrapping the real `<svg>`); they have no visual or a11y presence,
 *    so parity compares the HTML they actually produce, not the framework's
 *    component-instantiation artifacts. Their children are hoisted in place.
 *  - `<svg>` is a leaf: keep its `upup-` classes, do NOT recurse into glyph internals
 *  - skip non-element nodes (text/comment) — structure only
 *
 * MUST be self-contained (serialized into the page by page.$eval).
 */
export function normalizeElement(el: Element): NormalizedNode {
  const isUpupHidden = (node: Element) => node.classList.contains('upup-hidden')

  const upupClasses = (node: Element) =>
    Array.from(node.classList)
      .filter((c) => c.startsWith('upup-'))
      .sort()

  // A transparent component host: a custom element (hyphenated tag) with no
  // styling and no semantic hooks — pure framework plumbing, unwrapped.
  const isTransparentHost = (node: Element) => {
    if (!node.tagName.includes('-')) return false
    if (upupClasses(node).length) return false
    if (
      node.getAttribute('data-testid') !== null ||
      node.getAttribute('data-upup-slot') !== null ||
      node.getAttribute('role') !== null ||
      node.getAttribute('tabindex') !== null ||
      node.getAttribute('type') !== null
    ) {
      return false
    }
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.startsWith('aria-')) return false
    }
    return true
  }

  // Collect normalized children of `node`, skipping upup-hidden subtrees and
  // hoisting the children of transparent hosts in place (recursively).
  const collectChildren = (node: Element): NormalizedNode[] => {
    const out: NormalizedNode[] = []
    for (const child of Array.from(node.children)) {
      if (isUpupHidden(child)) continue
      if (isTransparentHost(child)) {
        for (const gc of collectChildren(child)) out.push(gc)
      } else {
        out.push(norm(child))
      }
    }
    return out
  }

  const norm = (node: Element): NormalizedNode => {
    const tag = node.tagName.toLowerCase()

    const out: NormalizedNode = { tag, classes: upupClasses(node), children: [] }

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

    out.children = collectChildren(node)
    return out
  }

  // The root itself is assumed to be a real, located element (never a transparent
  // host or upup-hidden — it is selected by a stable testid).
  return norm(el)
}
