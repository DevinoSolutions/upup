import { render, nothing, type TemplateResult } from 'lit-html'
import type { UploaderContext } from '../lib/types'

/**
 * Vanilla equivalent of React's SourceViewHeaderExtraContext + portal. The
 * SourceView renders an empty host `<span>` in its header row (left of "Back")
 * and registers it here via a stable ref callback. A source view (drive browser)
 * teleports its account controls (avatar + log out + separator) into that host
 * by calling `renderHeaderExtra(ctx, <template>)` during its own render — a
 * lit-html sub-render into the ref'd container, the standard portal pattern.
 *
 * The host is registered on mount (after the first paint), so a source view's
 * first render is a no-op; account controls only appear once the drive is
 * authenticated (a later render), by which point the host exists. `empty:hidden`
 * on the host keeps the header gap from showing when nothing is teleported in.
 */
const hosts = new WeakMap<UploaderContext, HTMLElement | null>()

export function setHeaderExtraHost(
    ctx: UploaderContext,
    el: HTMLElement | null,
): void {
    hosts.set(ctx, el)
    // A newly-unmounted host needs nothing; a newly-mounted one starts empty and
    // is filled by the next source-view render.
}

export function getHeaderExtraHost(ctx: UploaderContext): HTMLElement | null {
    return hosts.get(ctx) ?? null
}

/** Render `content` into the header-extra host, or clear it with `nothing`. No-op
 *  until the host is mounted. */
export function renderHeaderExtra(
    ctx: UploaderContext,
    content: TemplateResult | typeof nothing,
): void {
    const host = hosts.get(ctx)
    if (host) render(content, host)
}
