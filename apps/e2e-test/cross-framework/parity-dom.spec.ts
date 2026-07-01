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

  test('unwraps transparent custom-element component hosts (angular)', async ({ page }) => {
    await page.setContent(`
      <div id="root" class="upup-wrap" data-testid="upup-x">
        <upup-icon-my-device>
          <upup-icon>
            <svg class="upup-text-blue-600"><path d="M0 0"/></svg>
          </upup-icon>
        </upup-icon-my-device>
        <upup-keep class="upup-styled" data-testid="keep-me">
          <span class="upup-inner">label</span>
        </upup-keep>
      </div>
    `)
    const got: NormalizedNode = await page.$eval('#root', normalizeElement)
    expect(got).toEqual({
      tag: 'div',
      testid: 'upup-x',
      classes: ['upup-wrap'],
      children: [
        // both hyphenated hosts are class-less + hook-less ⇒ unwrapped, svg hoisted
        { tag: 'svg', classes: ['upup-text-blue-600'], children: [] },
        // a custom element carrying a upup- class AND a testid is NOT transparent ⇒ kept
        {
          tag: 'upup-keep',
          testid: 'keep-me',
          classes: ['upup-styled'],
          children: [{ tag: 'span', classes: ['upup-inner'], children: [] }],
        },
      ],
    })
  })

  test('excludes React-first a11y additions not yet ported (list/listitem roles + sr-only region)', async ({ page }) => {
    await page.setContent(`
      <div id="root" class="upup-wrap" data-testid="upup-file-list">
        <div role="status" aria-live="polite" class="upup-sr-only">2 files selected</div>
        <div role="list" class="upup-inner" data-upup-slot="file-list-virtual">
          <div role="listitem" class="upup-item" data-testid="upup-file-item">
            <span class="upup-name">a.png</span>
          </div>
        </div>
      </div>
    `)
    const got: NormalizedNode = await page.$eval('#root', normalizeElement)
    expect(got).toEqual({
      tag: 'div',
      testid: 'upup-file-list',
      classes: ['upup-wrap'],
      children: [
        // upup-sr-only status region skipped entirely (React-first a11y, not yet ported)
        {
          tag: 'div',
          slot: 'file-list-virtual',
          classes: ['upup-inner'],
          // role="list" dropped from the parity contract until the port lands
          children: [
            {
              tag: 'div',
              testid: 'upup-file-item',
              classes: ['upup-item'],
              // role="listitem" likewise dropped
              children: [{ tag: 'span', classes: ['upup-name'], children: [] }],
            },
          ],
        },
      ],
    })
  })
})
