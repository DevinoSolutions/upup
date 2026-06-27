import { test, expect } from '@playwright/test'
import { normalizeElement, type NormalizedNode } from './parity-dom'

test.describe('parity-dom normalizer', () => {
  test('strips framework noise, keeps the shared contract', async ({ page }) => {
    await page.setContent(`
      <div id="root" class="upup-card zebra upup-inline-block" data-v-abc12 _ngcontent-x="" data-svelte-h="svelte-1" style="color:red" data-testid="upup-thing" data-upup-slot="thing" role="button" tabindex="0" aria-label="hi" aria-pressed="true">
        <svg class="upup-text-5xl upup-text-blue-600"><path d="M0 0"/></svg>
        <input type="file" class="upup-hidden" data-testid="upup-file-input" aria-hidden="true" tabindex="-1" />
        <span class="upup-badge">x</span>
      </div>
    `)
    const got: NormalizedNode = await page.$eval('#root', normalizeElement)
    expect(got).toEqual({
      tag: 'div',
      testid: 'upup-thing',
      slot: 'thing',
      role: 'button',
      tabindex: '0',
      aria: { 'aria-label': 'hi', 'aria-pressed': 'true' },
      classes: ['upup-card', 'upup-inline-block'],
      children: [
        // <svg> is a leaf: classes kept, internals NOT recursed
        { tag: 'svg', classes: ['upup-text-5xl', 'upup-text-blue-600'], children: [] },
        // the upup-hidden input subtree is skipped entirely
        { tag: 'span', classes: ['upup-badge'], children: [] },
      ],
    })
  })
})
