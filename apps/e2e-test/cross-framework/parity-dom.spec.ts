import { test, expect } from '@playwright/test'
import { normalizeElement, type NormalizedNode } from './parity-dom'

const NO_GAPS = { classes: [], roles: [] }

test.describe('parity-dom normalizer', () => {
    test('strips framework noise, keeps the shared contract', async ({
        page,
    }) => {
        await page.setContent(`
      <div id="root" class="upup-card zebra upup-inline-block" data-v-abc12 _ngcontent-x="" data-svelte-h="svelte-1" style="color:red" data-testid="upup-thing" data-upup-slot="thing" role="button" tabindex="0" aria-label="hi" aria-pressed="true">
        <svg class="upup-text-5xl upup-text-blue-600"><path d="M0 0"/></svg>
        <input type="file" class="upup-hidden" data-testid="upup-file-input" aria-hidden="true" tabindex="-1" />
        <span class="upup-badge">x</span>
      </div>
    `)
        const got: NormalizedNode = await page.$eval(
            '#root',
            normalizeElement,
            NO_GAPS,
        )
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
                {
                    tag: 'svg',
                    classes: ['upup-text-5xl', 'upup-text-blue-600'],
                    children: [],
                },
                // the upup-hidden input subtree is skipped entirely
                {
                    tag: 'span',
                    classes: ['upup-badge'],
                    text: 'x',
                    children: [],
                },
            ],
        })
    })

    test('unwraps transparent custom-element component hosts (angular)', async ({
        page,
    }) => {
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
        const got: NormalizedNode = await page.$eval(
            '#root',
            normalizeElement,
            NO_GAPS,
        )
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
                    children: [
                        {
                            tag: 'span',
                            classes: ['upup-inner'],
                            text: 'label',
                            children: [],
                        },
                    ],
                },
            ],
        })
    })

    test('excludes nodes matching the provided a11y-gap skip classes, and drops the provided skip roles', async ({
        page,
    }) => {
        // A FIXED synthetic gap list, deliberately not the live parity-a11y-gaps
        // manifest: this test pins the normalizer's exclusion MECHANICS. Coupling
        // it to the live manifest made it break every time a gap healed (the
        // sr-only-live-region prune of 2026-07-09 did exactly that) — manifest
        // lifecycle is parity.spec.ts's job (its all-ported forcing check), not
        // this file's.
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
        const got: NormalizedNode = await page.$eval(
            '#root',
            normalizeElement,
            {
                classes: ['upup-sr-only'],
                roles: ['list', 'listitem'],
            },
        )
        expect(got).toEqual({
            tag: 'div',
            testid: 'upup-file-list',
            classes: ['upup-wrap'],
            children: [
                // the upup-sr-only subtree is skipped entirely (class-kind gap)
                {
                    tag: 'div',
                    slot: 'file-list-virtual',
                    classes: ['upup-inner'],
                    // role="list" dropped from the node, node itself kept (role-kind gap)
                    children: [
                        {
                            tag: 'div',
                            testid: 'upup-file-item',
                            classes: ['upup-item'],
                            // role="listitem" likewise dropped
                            children: [
                                {
                                    tag: 'span',
                                    classes: ['upup-name'],
                                    text: 'a.png',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        })
    })
})
