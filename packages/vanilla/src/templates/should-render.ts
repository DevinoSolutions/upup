import { nothing } from 'lit-html'
import type { TemplateResult } from 'lit-html'

/** Mirrors svelte ShouldRender: render the template only when cond is truthy. */
export function shouldRender(cond: unknown, tpl: () => TemplateResult | typeof nothing): TemplateResult | typeof nothing {
  return cond ? tpl() : nothing
}
