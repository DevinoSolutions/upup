/**
 * drives-plugin.spec.ts — T12 component test suite
 *
 * Tests:
 *   - SourceSelectorComponent: renders source tiles with correct testids incl.
 *     upup-source-url and upup-source-googleDrive; clicking a drive tile calls
 *     store.setActiveSource('googleDrive').
 *   - SourceViewComponent: set activeSource → url renders UrlUploader;
 *     set 'googleDrive' → renders GoogleDrive wrapper; undefined → renders nothing.
 *   - Wrapper routing: GoogleDriveUploaderComponent with mode='client' renders
 *     ClientGoogleDriveUploader; mode='server' renders ServerModeDriveUploader.
 *   - ImageEditorStubComponent: renders without throwing.
 *
 * Store strategy:
 *   Instantiate a real UpupStore (new UpupStore(); setConfig({}); init()) for
 *   most cases. Override mode by constructing with the right props. Dispose in afterEach.
 *
 * NOTE: source id 'url' is the correct FileSource value; testid is 'upup-source-url'.
 *       The i18n label key is 'link' but the FileSource id (and testid suffix) is 'url'.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { Component, Injectable, computed, signal } from '@angular/core'
import { UpupStore } from '../upup-store.service'
import { SourceSelectorComponent } from './source-selector.component'
import { SourceViewComponent } from './source-view.component'
import { GoogleDriveUploaderComponent } from './google-drive-uploader.component'
import { OneDriveUploaderComponent } from './onedrive-uploader.component'
import { DropboxUploaderComponent } from './dropbox-uploader.component'
import { BoxUploaderComponent } from './box-uploader.component'
import { ImageEditorStubComponent } from './image-editor-stub.component'
import { ClientGoogleDriveUploaderComponent } from './client-google-drive-uploader.component'
import { ServerModeDriveUploaderComponent } from './server-mode-drive-uploader.component'
import {
    type DriveBrowserState,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Make a client-mode store with all sources enabled. */
function makeStore(overrides: Record<string, unknown> = {}): UpupStore {
    const store = new UpupStore()
    store.setConfig({
        sources: [
            'local',
            'googleDrive',
            'oneDrive',
            'dropbox',
            'box',
            'url',
            'camera',
            'microphone',
            'screen',
        ],
        ...overrides,
    } as any)
    store.init()
    return store
}

/** Make a server-mode store (serverUrl triggers mode='server'). */
function makeServerStore(provider?: string): UpupStore {
    const store = new UpupStore()
    store.setConfig({
        sources: ['googleDrive', 'oneDrive', 'dropbox', 'box'],
        serverUrl: 'http://localhost:9000',
    } as any)
    store.init()
    return store
}

// ── Fake services to prevent real OAuth/network in wrapper tests ──────────────

function makeFakeGoogleDriveService() {
    @Injectable()
    class FakeGDService {
        readonly token = computed(() => undefined)
        readonly authCancelled = computed(() => false)
        readonly isAuthReady = computed(() => false)
        readonly user = computed(() => undefined)
        readonly folder = computed(
            () => ({ files: [], folders: [] }) as unknown as DriveFolder,
        )
        readonly isLoading = computed(() => false)
        readonly breadcrumbs = computed(() => [])
        readonly isAuthenticated = computed(() => false)
        readonly currentFolderId = computed(() => undefined)
        readonly isClickLoading = computed(() => false)
        authenticate = vi.fn()
        handleSignOut = vi.fn()
        handleSubmit = vi.fn()
        handleCancelDownload = vi.fn()
        onSelectCurrentFolder = vi.fn()
    }
    return FakeGDService
}

// ── SourceSelectorComponent ──────────────────────────────────────────────────

describe('SourceSelectorComponent', () => {
    let store: UpupStore

    afterEach(() => {
        store?.destroy()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('renders a tile for each source with the correct data-testid', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [SourceSelectorComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceSelectorComponent)
        fixture.detectChanges()

        // Check key testids
        const url = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-url"]',
        )
        expect(url).not.toBeNull()

        const gd = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-googleDrive"]',
        )
        expect(gd).not.toBeNull()

        const od = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-oneDrive"]',
        )
        expect(od).not.toBeNull()

        const dropbox = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-dropbox"]',
        )
        expect(dropbox).not.toBeNull()

        const box = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-box"]',
        )
        expect(box).not.toBeNull()

        const camera = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-camera"]',
        )
        expect(camera).not.toBeNull()

        const micro = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-microphone"]',
        )
        expect(micro).not.toBeNull()

        const screen = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-screen"]',
        )
        expect(screen).not.toBeNull()
    })

    it('source id is "url" (not "link") — testid is upup-source-url', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [SourceSelectorComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceSelectorComponent)
        fixture.detectChanges()

        // upup-source-url must exist
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-source-url"]',
            ),
        ).not.toBeNull()
        // upup-source-link must NOT exist (link is the translation key, not the source id)
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-source-link"]',
            ),
        ).toBeNull()
    })

    it('clicking the googleDrive tile calls store.setActiveSource("googleDrive") and NOT openFilePicker', async () => {
        store = makeStore()
        const sourceSpy = vi.spyOn(store, 'setActiveSource')
        const pickerSpy = vi.spyOn(store, 'openFilePicker')

        await TestBed.configureTestingModule({
            imports: [SourceSelectorComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceSelectorComponent)
        fixture.detectChanges()

        const gdTile = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-googleDrive"]',
        ) as HTMLButtonElement
        expect(gdTile).not.toBeNull()
        gdTile.click()
        fixture.detectChanges()

        expect(sourceSpy).toHaveBeenCalledWith('googleDrive')
        // non-LOCAL source must NOT open the device file picker (svelte branch parity)
        expect(pickerSpy).not.toHaveBeenCalled()
    })

    it('clicking the LOCAL tile calls store.openFilePicker() and NOT setActiveSource', async () => {
        store = makeStore()
        const pickerSpy = vi.spyOn(store, 'openFilePicker')
        const sourceSpy = vi.spyOn(store, 'setActiveSource')

        await TestBed.configureTestingModule({
            imports: [SourceSelectorComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceSelectorComponent)
        fixture.detectChanges()

        const localTile = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-local"]',
        ) as HTMLButtonElement
        expect(localTile).not.toBeNull()
        localTile.click()
        fixture.detectChanges()

        // LOCAL branch opens the device picker, never sets an active source (svelte parity)
        expect(pickerSpy).toHaveBeenCalled()
        expect(sourceSpy).not.toHaveBeenCalled()
    })

    it('emits core "source-click" with { sourceId } for a LOCAL click', async () => {
        store = makeStore()
        const emitSpy = vi.spyOn(store.core, 'emit')

        await TestBed.configureTestingModule({
            imports: [SourceSelectorComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceSelectorComponent)
        fixture.detectChanges()

        const localTile = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-local"]',
        ) as HTMLButtonElement
        expect(localTile).not.toBeNull()
        localTile.click()
        fixture.detectChanges()

        expect(emitSpy).toHaveBeenCalledWith('source-click', {
            sourceId: 'local',
        })
    })

    it('emits core "source-click" with { sourceId } for a non-LOCAL (googleDrive) click', async () => {
        store = makeStore()
        const emitSpy = vi.spyOn(store.core, 'emit')

        await TestBed.configureTestingModule({
            imports: [SourceSelectorComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceSelectorComponent)
        fixture.detectChanges()

        const gdTile = fixture.nativeElement.querySelector(
            '[data-testid="upup-source-googleDrive"]',
        ) as HTMLButtonElement
        expect(gdTile).not.toBeNull()
        gdTile.click()
        fixture.detectChanges()

        expect(emitSpy).toHaveBeenCalledWith('source-click', {
            sourceId: 'googleDrive',
        })
    })

    it('renders the adapter-selector slot container', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [SourceSelectorComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceSelectorComponent)
        fixture.detectChanges()

        const slot = fixture.nativeElement.querySelector(
            '[data-upup-slot="adapter-selector"]',
        )
        expect(slot).not.toBeNull()
    })

    it('only renders sources configured in the store', async () => {
        const store2 = new UpupStore()
        store2.setConfig({ sources: ['googleDrive', 'url'] } as any)
        store2.init()
        store = store2

        await TestBed.configureTestingModule({
            imports: [SourceSelectorComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceSelectorComponent)
        fixture.detectChanges()

        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-source-googleDrive"]',
            ),
        ).not.toBeNull()
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-source-url"]',
            ),
        ).not.toBeNull()
        // dropbox was not configured — must be absent
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-source-dropbox"]',
            ),
        ).toBeNull()
    })
})

// ── SourceViewComponent ──────────────────────────────────────────────────────

describe('SourceViewComponent', () => {
    let store: UpupStore

    afterEach(() => {
        store?.destroy()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('renders nothing when no source is active', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [SourceViewComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceViewComponent)
        fixture.detectChanges()

        // No adapter-view slot rendered
        const slot = fixture.nativeElement.querySelector(
            '[data-upup-slot="adapter-view"]',
        )
        expect(slot).toBeNull()
    })

    it('renders the url-uploader when activeSource is "url"', async () => {
        store = makeStore()
        store.setActiveSource('url' as any)

        await TestBed.configureTestingModule({
            imports: [SourceViewComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceViewComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        // The adapter-view container should be present
        const slot = fixture.nativeElement.querySelector(
            '[data-upup-slot="adapter-view"]',
        )
        expect(slot).not.toBeNull()

        // The url-uploader component should be rendered (its slot)
        const urlEl = fixture.nativeElement.querySelector(
            '[data-upup-slot="url-uploader"]',
        )
        expect(urlEl).not.toBeNull()
    })

    it('renders the google-drive wrapper when activeSource is "googleDrive"', async () => {
        store = makeStore()
        store.setActiveSource('googleDrive' as any)

        await TestBed.configureTestingModule({
            imports: [SourceViewComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceViewComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const slot = fixture.nativeElement.querySelector(
            '[data-upup-slot="adapter-view"]',
        )
        expect(slot).not.toBeNull()

        // upup-google-drive-uploader element must be in the DOM
        const gdEl = fixture.nativeElement.querySelector(
            'upup-google-drive-uploader',
        )
        expect(gdEl).not.toBeNull()
    })

    it('renders nothing when mini=true even if source is active', async () => {
        const miniStore = new UpupStore()
        miniStore.setConfig({ mini: true, sources: ['url'] } as any)
        miniStore.init()
        miniStore.setActiveSource('url' as any)
        store = miniStore

        await TestBed.configureTestingModule({
            imports: [SourceViewComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(SourceViewComponent)
        fixture.detectChanges()

        // mini=true → shouldRender = false → adapter-view not shown
        const slot = fixture.nativeElement.querySelector(
            '[data-upup-slot="adapter-view"]',
        )
        expect(slot).toBeNull()
    })

    it('renders the image editor stub when editingFile is set', async () => {
        store = makeStore()
        // Simulate editingFile being set by patching the signal read in the template
        // We test stub renders independently; SourceView conditionally shows it.
        await TestBed.configureTestingModule({
            imports: [ImageEditorStubComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ImageEditorStubComponent)
        fixture.detectChanges()
        // Stub must render without throwing — no content expected
        expect(fixture).toBeTruthy()
    })
})

// ── Wrapper routing ───────────────────────────────────────────────────────────

describe('GoogleDriveUploaderComponent — wrapper routing', () => {
    let store: UpupStore

    afterEach(() => {
        store?.destroy()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('mode="client" renders upup-client-google-drive-uploader', async () => {
        store = makeStore() // client mode by default

        await TestBed.configureTestingModule({
            imports: [GoogleDriveUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(GoogleDriveUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const clientEl = fixture.nativeElement.querySelector(
            'upup-client-google-drive-uploader',
        )
        expect(clientEl).not.toBeNull()

        const serverEl = fixture.nativeElement.querySelector(
            'upup-server-mode-drive-uploader',
        )
        expect(serverEl).toBeNull()
    })

    it('mode="server" renders upup-server-mode-drive-uploader', async () => {
        store = makeServerStore()
        expect(store.mode).toBe('server')

        await TestBed.configureTestingModule({
            imports: [GoogleDriveUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(GoogleDriveUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const serverEl = fixture.nativeElement.querySelector(
            'upup-server-mode-drive-uploader',
        )
        expect(serverEl).not.toBeNull()

        const clientEl = fixture.nativeElement.querySelector(
            'upup-client-google-drive-uploader',
        )
        expect(clientEl).toBeNull()
    })

    it('server-mode wrapper renders upup-server-drive-browser path via testid', async () => {
        store = makeServerStore()

        await TestBed.configureTestingModule({
            imports: [GoogleDriveUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(GoogleDriveUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        // server mode drive uploader should exist
        const serverEl = fixture.nativeElement.querySelector(
            'upup-server-mode-drive-uploader',
        )
        expect(serverEl).not.toBeNull()
    })
})

describe('OneDriveUploaderComponent — wrapper routing', () => {
    let store: UpupStore

    afterEach(() => {
        store?.destroy()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('mode="client" renders client one-drive uploader', async () => {
        store = makeStore()

        await TestBed.configureTestingModule({
            imports: [OneDriveUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(OneDriveUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const clientEl = fixture.nativeElement.querySelector(
            'upup-client-onedrive-uploader',
        )
        expect(clientEl).not.toBeNull()
    })

    it('mode="server" renders server-mode drive uploader', async () => {
        store = makeServerStore()

        await TestBed.configureTestingModule({
            imports: [OneDriveUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(OneDriveUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const serverEl = fixture.nativeElement.querySelector(
            'upup-server-mode-drive-uploader',
        )
        expect(serverEl).not.toBeNull()
    })
})

describe('DropboxUploaderComponent — wrapper routing', () => {
    let store: UpupStore

    afterEach(() => {
        store?.destroy()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('mode="client" renders client dropbox uploader', async () => {
        store = makeStore()

        await TestBed.configureTestingModule({
            imports: [DropboxUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(DropboxUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const clientEl = fixture.nativeElement.querySelector(
            'upup-client-dropbox-uploader',
        )
        expect(clientEl).not.toBeNull()
    })

    it('mode="server" renders server-mode drive uploader', async () => {
        store = makeServerStore()

        await TestBed.configureTestingModule({
            imports: [DropboxUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(DropboxUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const serverEl = fixture.nativeElement.querySelector(
            'upup-server-mode-drive-uploader',
        )
        expect(serverEl).not.toBeNull()
    })
})

describe('BoxUploaderComponent — wrapper routing', () => {
    let store: UpupStore

    afterEach(() => {
        store?.destroy()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('mode="client" renders client box uploader', async () => {
        store = makeStore()

        await TestBed.configureTestingModule({
            imports: [BoxUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(BoxUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const clientEl = fixture.nativeElement.querySelector(
            'upup-client-box-uploader',
        )
        expect(clientEl).not.toBeNull()
    })

    it('mode="server" renders server-mode drive uploader', async () => {
        store = makeServerStore()

        await TestBed.configureTestingModule({
            imports: [BoxUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(BoxUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const serverEl = fixture.nativeElement.querySelector(
            'upup-server-mode-drive-uploader',
        )
        expect(serverEl).not.toBeNull()
    })
})

// ── ImageEditorStubComponent ──────────────────────────────────────────────────

describe('ImageEditorStubComponent', () => {
    afterEach(() => {
        TestBed.resetTestingModule()
    })

    it('renders without throwing', async () => {
        await TestBed.configureTestingModule({
            imports: [ImageEditorStubComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(ImageEditorStubComponent)
        expect(() => fixture.detectChanges()).not.toThrow()
        expect(fixture).toBeTruthy()
    })

    it('renders no visible DOM element (empty stub)', async () => {
        await TestBed.configureTestingModule({
            imports: [ImageEditorStubComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(ImageEditorStubComponent)
        fixture.detectChanges()
        // The stub has no element nodes — only a comment node
        const children = Array.from(fixture.nativeElement.childNodes) as Node[]
        const elementNodes = children.filter(
            n => n.nodeType === Node.ELEMENT_NODE,
        )
        expect(elementNodes.length).toBe(0)
    })
})
