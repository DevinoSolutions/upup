/**
 * shell.spec.ts — TestBed tests for the four shell leaf components:
 *   ShouldRenderComponent, ProgressBarComponent, UploaderHeaderComponent, SourceViewContainerComponent
 *
 * Store strategy:
 *   - All four components inject UpupStore (ShouldRender reads icons.LoaderIcon for the
 *     loader branch — faithful svelte parity). We instantiate a real UpupStore
 *     (new UpupStore(); setConfig({}); init()) and provide it via
 *     { provide: UpupStore, useValue: store }. The store is disposed in afterEach.
 *
 * Content-projection tests use inline host components (a @Component wrapper that projects
 * a marker element via <upup-should-render [when]="cond">…</upup-should-render>).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { Component } from '@angular/core'
import { UpupStore } from '../upup-store.service'
import { ShouldRenderComponent } from './should-render.component'
import { ProgressBarComponent } from './progress-bar.component'
import { UploaderHeaderComponent } from './uploader-header.component'
import { SourceViewContainerComponent } from './source-view-container.component'
import { DefaultLoaderIconComponent } from './icons/default-loader-icon.component'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Create + init a real UpupStore (plain-class, no DI needed outside of TestBed). */
function makeStore(): UpupStore {
    const store = new UpupStore()
    store.setConfig({} as any)
    store.init()
    return store
}

// ── ShouldRender ───────────────────────────────────────────────────────────────

describe('ShouldRenderComponent', () => {
    let store: UpupStore

    afterEach(() => store?.dispose())

    it('projects content when when=true (and not loading)', async () => {
        store = makeStore()
        @Component({
            standalone: true,
            imports: [ShouldRenderComponent],
            template: `<upup-should-render [when]="true"><span data-testid="child">hello</span></upup-should-render>`,
        })
        class Host {}

        await TestBed.configureTestingModule({
            imports: [Host],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()
        const fixture = TestBed.createComponent(Host)
        fixture.detectChanges()
        const child = fixture.nativeElement.querySelector('[data-testid="child"]')
        expect(child).not.toBeNull()
        expect(child.textContent).toBe('hello')
    })

    it('renders nothing when when=false', async () => {
        store = makeStore()
        @Component({
            standalone: true,
            imports: [ShouldRenderComponent],
            template: `<upup-should-render [when]="false"><span data-testid="child">hello</span></upup-should-render>`,
        })
        class Host {}

        await TestBed.configureTestingModule({
            imports: [Host],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()
        const fixture = TestBed.createComponent(Host)
        fixture.detectChanges()
        const child = fixture.nativeElement.querySelector('[data-testid="child"]')
        expect(child).toBeNull()
    })

    it('renders the configured loader (not content) when isLoading=true', async () => {
        // Svelte parity: ShouldRender renders `icons.LoaderIcon` on isLoading.
        // Configure a real loader so we can assert it is rendered; the default
        // LoaderIcon is EmptyIcon (renders nothing).
        store = new UpupStore()
        store.setConfig({ icons: { LoaderIcon: DefaultLoaderIconComponent } } as any)
        store.init()

        @Component({
            standalone: true,
            imports: [ShouldRenderComponent],
            template: `<upup-should-render [when]="true" [isLoading]="true"><span data-testid="child">hello</span></upup-should-render>`,
        })
        class Host {}

        await TestBed.configureTestingModule({
            imports: [Host],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()
        const fixture = TestBed.createComponent(Host)
        fixture.detectChanges()

        // Loader branch: the DefaultLoaderIcon renders an <svg>; content is suppressed.
        const child = fixture.nativeElement.querySelector('[data-testid="child"]')
        expect(child).toBeNull()
        const svg = fixture.nativeElement.querySelector('svg')
        expect(svg).not.toBeNull()
    })

    it('with default loader (EmptyIcon), isLoading=true renders neither content nor svg', async () => {
        // Faithful parity: when icons.LoaderIcon defaults to EmptyIcon, the loader
        // branch renders nothing — but content is still suppressed (isLoading wins).
        store = makeStore()
        @Component({
            standalone: true,
            imports: [ShouldRenderComponent],
            template: `<upup-should-render [when]="true" [isLoading]="true"><span data-testid="child">hello</span></upup-should-render>`,
        })
        class Host {}

        await TestBed.configureTestingModule({
            imports: [Host],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()
        const fixture = TestBed.createComponent(Host)
        fixture.detectChanges()
        expect(fixture.nativeElement.querySelector('[data-testid="child"]')).toBeNull()
        expect(fixture.nativeElement.querySelector('svg')).toBeNull()
    })

    it('defaults to not rendering (when defaults to false)', async () => {
        store = makeStore()
        @Component({
            standalone: true,
            imports: [ShouldRenderComponent],
            template: `<upup-should-render><span data-testid="default-child">hi</span></upup-should-render>`,
        })
        class Host {}

        await TestBed.configureTestingModule({
            imports: [Host],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()
        const fixture = TestBed.createComponent(Host)
        fixture.detectChanges()
        // when defaults to false — content is not projected
        const child = fixture.nativeElement.querySelector('[data-testid="default-child"]')
        expect(child).toBeNull()
    })
})

// ── ProgressBar ────────────────────────────────────────────────────────────────

describe('ProgressBarComponent', () => {
    let store: UpupStore

    afterEach(() => store?.dispose())

    it('renders the progress bar element when progress > 0', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ProgressBarComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ProgressBarComponent)
        fixture.componentInstance.progress = 42
        fixture.detectChanges()

        const bar = fixture.nativeElement.querySelector('[data-testid="upup-progress-bar"]')
        expect(bar).not.toBeNull()
    })

    it('sets aria-valuenow to the progress value', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ProgressBarComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ProgressBarComponent)
        fixture.componentInstance.progress = 73
        fixture.detectChanges()

        const bar = fixture.nativeElement.querySelector('[data-testid="upup-progress-bar"]')
        expect(bar).not.toBeNull()
        expect(bar.getAttribute('aria-valuenow')).toBe('73')
    })

    it('sets the fill div width style to the progress percentage', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ProgressBarComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ProgressBarComponent)
        fixture.componentInstance.progress = 55
        fixture.detectChanges()

        const fill = fixture.nativeElement.querySelector('[data-testid="upup-progress-bar"] div div')
        expect(fill).not.toBeNull()
        // Angular sets style.width as "55%" (with or without decimal)
        const w = (fill as HTMLElement).style.width
        expect(w).toMatch(/55/)
    })

    it('renders nothing when progress is 0 and not uploading', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ProgressBarComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ProgressBarComponent)
        fixture.componentInstance.progress = 0
        fixture.detectChanges()

        const bar = fixture.nativeElement.querySelector('[data-testid="upup-progress-bar"]')
        expect(bar).toBeNull()
    })

    it('shows the progress text when showValue=true', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ProgressBarComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ProgressBarComponent)
        fixture.componentInstance.progress = 33
        fixture.componentInstance.showValue = true
        fixture.detectChanges()

        const p = fixture.nativeElement.querySelector('[data-testid="upup-progress-bar"] p')
        expect(p).not.toBeNull()
        expect(p.textContent.trim()).toContain('33')
    })

    it('hides the progress text when showValue=false (default)', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ProgressBarComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ProgressBarComponent)
        fixture.componentInstance.progress = 50
        fixture.componentInstance.showValue = false
        fixture.detectChanges()

        const p = fixture.nativeElement.querySelector('[data-testid="upup-progress-bar"] p')
        expect(p).toBeNull()
    })

    it('has role=progressbar', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ProgressBarComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ProgressBarComponent)
        fixture.componentInstance.progress = 10
        fixture.detectChanges()

        const bar = fixture.nativeElement.querySelector('[data-testid="upup-progress-bar"]')
        expect(bar?.getAttribute('role')).toBe('progressbar')
    })
})

// ── UploaderHeader ──────────────────────────────────────────────────────────────

describe('UploaderHeaderComponent', () => {
    let store: UpupStore

    afterEach(() => store?.dispose())

    it('renders the header element (data-testid="upup-header") when mini=false', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [UploaderHeaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(UploaderHeaderComponent)
        fixture.detectChanges()

        const header = fixture.nativeElement.querySelector('[data-testid="upup-header"]')
        expect(header).not.toBeNull()
    })

    it('renders nothing when mini=true', async () => {
        const s = new UpupStore()
        s.setConfig({ mini: true } as any)
        s.init()
        store = s

        await TestBed.configureTestingModule({
            imports: [UploaderHeaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(UploaderHeaderComponent)
        fixture.detectChanges()

        const header = fixture.nativeElement.querySelector('[data-testid="upup-header"]')
        expect(header).toBeNull()
    })

    it('calls handleCancel when the cancel button is clicked', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [UploaderHeaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(UploaderHeaderComponent)
        let called = false
        fixture.componentInstance.handleCancel = () => { called = true }
        fixture.detectChanges()

        const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement
        expect(btn).not.toBeNull()
        btn.click()
        expect(called).toBe(true)
    })

    it('has data-upup-slot="header" attribute', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [UploaderHeaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(UploaderHeaderComponent)
        fixture.detectChanges()

        const header = fixture.nativeElement.querySelector('[data-upup-slot="header"]')
        expect(header).not.toBeNull()
    })
})

// ── SourceViewContainer ───────────────────────────────────────────────────────

describe('SourceViewContainerComponent', () => {
    let store: UpupStore

    afterEach(() => store?.dispose())

    it('renders data-testid="upup-adapter-view"', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [SourceViewContainerComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceViewContainerComponent)
        fixture.detectChanges()

        const el = fixture.nativeElement.querySelector('[data-testid="upup-adapter-view"]')
        expect(el).not.toBeNull()
    })

    it('projects content inside the container', async () => {
        store = makeStore()

        @Component({
            standalone: true,
            imports: [SourceViewContainerComponent],
            template: `
                <upup-adapter-view-container>
                    <span data-testid="projected">inner</span>
                </upup-adapter-view-container>
            `,
        })
        class Host {}

        await TestBed.configureTestingModule({
            imports: [Host],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(Host)
        fixture.detectChanges()

        const projected = fixture.nativeElement.querySelector('[data-testid="projected"]')
        expect(projected).not.toBeNull()
        expect(projected.textContent.trim()).toBe('inner')
    })

    it('defaults data-upup-slot to "adapter-view"', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [SourceViewContainerComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceViewContainerComponent)
        fixture.detectChanges()

        const el = fixture.nativeElement.querySelector('[data-upup-slot="adapter-view"]')
        expect(el).not.toBeNull()
    })

    it('reflects a passed slotName onto data-upup-slot (svelte ...rest parity)', async () => {
        store = makeStore()

        @Component({
            standalone: true,
            imports: [SourceViewContainerComponent],
            template: `<upup-adapter-view-container slotName="audio-uploader"></upup-adapter-view-container>`,
        })
        class Host {}

        await TestBed.configureTestingModule({
            imports: [Host],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(Host)
        fixture.detectChanges()

        // The custom slot name is forwarded to the inner div…
        const el = fixture.nativeElement.querySelector('[data-upup-slot="audio-uploader"]')
        expect(el).not.toBeNull()
        // …and the default value is no longer present.
        expect(fixture.nativeElement.querySelector('[data-upup-slot="adapter-view"]')).toBeNull()
        // It is still the same adapter-view element.
        expect(el.getAttribute('data-testid')).toBe('upup-adapter-view')
    })

    it('container has base flex classes in classList', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [SourceViewContainerComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceViewContainerComponent)
        fixture.detectChanges()

        const el = fixture.nativeElement.querySelector('[data-testid="upup-adapter-view"]') as HTMLElement
        expect(el).not.toBeNull()
        // Base class always present
        expect(el.className).toContain('upup-flex')
        expect(el.className).toContain('upup-items-center')
        expect(el.className).toContain('upup-justify-center')
    })
})
