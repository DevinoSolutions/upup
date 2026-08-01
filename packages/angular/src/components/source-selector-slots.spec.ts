/**
 * source-selector-slots.spec.ts — theme slot consumption (N3-T7).
 *
 * The react SourceSelector applies the flat slot overrides sourceButtonList /
 * sourceButton / sourceButtonText / sourceButtonIcon (from
 * theme.slots.sourceSelector.*). The angular port must land the same classes
 * on the same elements: list div, tile button, label span, icon svg.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { UpupStore } from '../upup-store.service'
import { SourceSelectorComponent } from './source-selector.component'

function makeThemedStore(): UpupStore {
    const store = new UpupStore()
    store.setConfig({
        sources: ['local', 'googleDrive', 'camera'],
        theme: {
            slots: {
                sourceSelector: {
                    sourceList: 'test-slot-list',
                    sourceButton: 'test-slot-button',
                    sourceButtonText: 'test-slot-text',
                    sourceButtonIcon: 'test-slot-icon',
                },
            },
        },
    } as never)
    store.init()
    return store
}

describe('SourceSelectorComponent — source* theme slots', () => {
    let store: UpupStore

    afterEach(() => {
        store?.destroy()
        TestBed.resetTestingModule()
    })

    async function mount() {
        await TestBed.configureTestingModule({
            imports: [SourceSelectorComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()
        const fixture = TestBed.createComponent(SourceSelectorComponent)
        fixture.detectChanges()
        return fixture.nativeElement as HTMLElement
    }

    it('applies sourceList override to the tile list container', async () => {
        store = makeThemedStore()
        const el = await mount()
        const tile = el.querySelector('[data-testid="upup-source-local"]')!
        expect(tile.parentElement!.classList.contains('test-slot-list')).toBe(
            true,
        )
    })

    it('applies sourceButton override to every tile button', async () => {
        store = makeThemedStore()
        const el = await mount()
        const tiles = el.querySelectorAll('button[data-testid^="upup-source-"]')
        expect(tiles.length).toBeGreaterThan(0)
        for (const tile of tiles) {
            expect(tile.classList.contains('test-slot-button')).toBe(true)
        }
    })

    it('applies sourceButtonText override to the tile label', async () => {
        store = makeThemedStore()
        const el = await mount()
        // Chip structure: <button><span.icon-box><svg/></span><span.label/></button>
        // — the label is the LAST span (the icon box span comes first).
        const spans = el.querySelectorAll(
            '[data-testid="upup-source-local"] span',
        )
        const label = spans[spans.length - 1]!
        expect(label.classList.contains('test-slot-text')).toBe(true)
    })

    it('applies sourceButtonIcon override to the tile icon svg', async () => {
        store = makeThemedStore()
        const el = await mount()
        const svg = el.querySelector('[data-testid="upup-source-local"] svg')!
        expect(svg).not.toBeNull()
        expect(svg.classList.contains('test-slot-icon')).toBe(true)
    })
})
