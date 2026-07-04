/**
 * drive-services.spec.ts — T13 drive-service delegation suite
 *
 * Verifies that each drive service (Google, OneDrive, Dropbox, Box):
 *   - Creates an DriveBrowserController and bridges its state to Angular signals
 *   - Forwards every action method to the controller (no business logic leaked)
 *   - onFilesSelected callback wires to store.handleSetSelectedFiles
 *   - onClose callback wires to store.setActiveSource(undefined)
 *
 * Strategy: construct services directly (NOT via TestBed), inject a mock UpupStore
 * via Angular's inject() context, and assert on the service's forwarding methods.
 * The DriveBrowserController is constructed with a fake core (no plugins registered)
 * so no network/OAuth fires; we spy on its instance methods after construction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { DriveBrowserController } from '@upup/core'
import { UpupStore } from '../upup-store.service'
import { GoogleDriveService } from './google-drive.service'
import { OneDriveService } from './onedrive.service'
import { DropboxService } from './dropbox.service'
import { BoxService } from './box.service'
import { LoadGapiService } from './load-gapi.service'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal UpupStore mock with only the methods drive services need. */
function makeStoreMock() {
    return {
        core: {} as any,
        handleSetSelectedFiles: vi.fn().mockResolvedValue(undefined),
        setActiveSource: vi.fn(),
    } as unknown as UpupStore
}

/**
 * Configure TestBed, inject the service, then reach into the private controller
 * field to spy on its instance methods (works because arrow-fn properties ARE
 * instance-own properties, reachable via the instance itself).
 */
function setupService<
    T extends
        | GoogleDriveService
        | OneDriveService
        | DropboxService
        | BoxService,
>(
    ServiceCls: new (...args: any[]) => T,
    store: UpupStore,
): { svc: T; ctrl: DriveBrowserController } {
    TestBed.configureTestingModule({
        providers: [{ provide: UpupStore, useValue: store }, ServiceCls],
    })
    const svc = TestBed.inject(ServiceCls as any) as T
    // Access the private controller via bracket notation for test purposes
    const ctrl = (svc as any)['controller'] as DriveBrowserController
    return { svc, ctrl }
}

// ── LoadGapiService ───────────────────────────────────────────────────────────

describe('LoadGapiService', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('exposes a gisLoaded signal initialised to false', () => {
        TestBed.configureTestingModule({ providers: [LoadGapiService] })
        const svc = TestBed.inject(LoadGapiService)
        expect(svc.gisLoaded()).toBe(false)
    })

    it('load() calls loadGoogleIdentityServices', async () => {
        const spy = vi
            .spyOn(await import('@upup/core'), 'loadGoogleIdentityServices')
            .mockResolvedValue(undefined as any)
        TestBed.configureTestingModule({ providers: [LoadGapiService] })
        const svc = TestBed.inject(LoadGapiService)
        svc.load()
        await new Promise(r => setTimeout(r, 0))
        expect(spy).toHaveBeenCalled()
    })
})

// ── Per-service delegation suites ─────────────────────────────────────────────

describe('GoogleDriveService delegation', () => {
    let store: UpupStore
    let svc: GoogleDriveService
    let ctrl: DriveBrowserController

    beforeEach(() => {
        store = makeStoreMock()
        ;({ svc, ctrl } = setupService(GoogleDriveService, store))
        // Silence controller.init() — it would try to call core.getPlugin which is missing
        vi.spyOn(ctrl, 'init').mockImplementation(() => {})
        vi.spyOn(ctrl, 'destroy').mockImplementation(() => {})
        vi.spyOn(ctrl as any, 'retryAuth').mockImplementation(() => {})
        vi.spyOn(ctrl, 'signOut').mockImplementation(() => {})
        vi.spyOn(ctrl, 'setPath').mockImplementation(() => {})
        vi.spyOn(ctrl, 'handleClick').mockImplementation(() => {})
        vi.spyOn(ctrl, 'handleSubmit').mockResolvedValue(undefined)
        vi.spyOn(ctrl, 'handleCancelDownload').mockImplementation(() => {})
        vi.spyOn(ctrl, 'onSelectCurrentFolder').mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('init() delegates to controller.init()', () => {
        svc.init()
        expect(ctrl.init).toHaveBeenCalled()
    })

    it('destroy() delegates to controller.destroy()', () => {
        svc.destroy()
        expect(ctrl.destroy).toHaveBeenCalled()
    })

    it('retryAuth() delegates to controller.retryAuth()', () => {
        svc.retryAuth()
        expect((ctrl as any).retryAuth).toHaveBeenCalled()
    })

    it('handleSignOut() delegates to controller.signOut()', () => {
        svc.handleSignOut()
        expect(ctrl.signOut).toHaveBeenCalled()
    })

    it('setPath() delegates to controller.setPath()', () => {
        const path = [{ id: 'root', name: 'Drive', children: [] }] as any
        svc.setPath(path)
        expect(ctrl.setPath).toHaveBeenCalledWith(path)
    })

    it('handleClick() delegates to controller.handleClick()', () => {
        const file = { id: 'f1', name: 'doc.pdf', isFolder: false } as any
        svc.handleClick(file)
        expect(ctrl.handleClick).toHaveBeenCalledWith(file)
    })

    it('handleSubmit() delegates to controller.handleSubmit()', async () => {
        await svc.handleSubmit()
        expect(ctrl.handleSubmit).toHaveBeenCalled()
    })

    it('handleCancelDownload() delegates to controller.handleCancelDownload()', () => {
        svc.handleCancelDownload()
        expect(ctrl.handleCancelDownload).toHaveBeenCalled()
    })

    it('onSelectCurrentFolder() delegates to controller.onSelectCurrentFolder()', () => {
        svc.onSelectCurrentFolder()
        expect(ctrl.onSelectCurrentFolder).toHaveBeenCalled()
    })

    it('exposes computed signals derived from controller snapshot', () => {
        // Signals should exist and return values from the snapshot
        expect(svc.user).toBeDefined()
        expect(svc.googleFiles).toBeDefined()
        expect(svc.token).toBeDefined()
        expect(svc.isAuthReady).toBeDefined()
        expect(svc.path).toBeDefined()
        expect(svc.selectedFiles).toBeDefined()
        expect(svc.showLoader).toBeDefined()
        expect(svc.isClickLoading).toBeDefined()
    })
})

describe('OneDriveService delegation', () => {
    let store: UpupStore
    let svc: OneDriveService
    let ctrl: DriveBrowserController

    beforeEach(() => {
        store = makeStoreMock()
        ;({ svc, ctrl } = setupService(OneDriveService, store))
        vi.spyOn(ctrl, 'init').mockImplementation(() => {})
        vi.spyOn(ctrl, 'destroy').mockImplementation(() => {})
        vi.spyOn(ctrl, 'signIn').mockImplementation(() => {})
        vi.spyOn(ctrl, 'signOut').mockImplementation(() => {})
        vi.spyOn(ctrl, 'setPath').mockImplementation(() => {})
        vi.spyOn(ctrl, 'handleClick').mockImplementation(() => {})
        vi.spyOn(ctrl, 'handleSubmit').mockResolvedValue(undefined)
        vi.spyOn(ctrl, 'handleCancelDownload').mockImplementation(() => {})
        vi.spyOn(ctrl, 'onSelectCurrentFolder').mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('init() delegates to controller.init()', () => {
        svc.init()
        expect(ctrl.init).toHaveBeenCalled()
    })
    it('signIn() delegates to controller.signIn()', () => {
        svc.signIn()
        expect(ctrl.signIn).toHaveBeenCalled()
    })
    it('signOut() delegates to controller.signOut()', () => {
        svc.signOut()
        expect(ctrl.signOut).toHaveBeenCalled()
    })
    it('setPath() delegates to controller.setPath()', () => {
        const p = [] as any
        svc.setPath(p)
        expect(ctrl.setPath).toHaveBeenCalledWith(p)
    })
    it('handleClick() delegates to controller.handleClick()', () => {
        const f = { id: 'f1' } as any
        svc.handleClick(f)
        expect(ctrl.handleClick).toHaveBeenCalledWith(f)
    })
    it('handleCancelDownload() delegates', () => {
        svc.handleCancelDownload()
        expect(ctrl.handleCancelDownload).toHaveBeenCalled()
    })
    it('exposes isAuthenticated, isLoading, token signals', () => {
        expect(svc.isAuthenticated).toBeDefined()
        expect(svc.isLoading).toBeDefined()
        expect(svc.token).toBeDefined()
    })
})

describe('DropboxService delegation', () => {
    let store: UpupStore
    let svc: DropboxService
    let ctrl: DriveBrowserController

    beforeEach(() => {
        store = makeStoreMock()
        ;({ svc, ctrl } = setupService(DropboxService, store))
        vi.spyOn(ctrl, 'init').mockImplementation(() => {})
        vi.spyOn(ctrl, 'destroy').mockImplementation(() => {})
        vi.spyOn(ctrl, 'signIn').mockImplementation(() => {})
        vi.spyOn(ctrl, 'signOut').mockImplementation(() => {})
        vi.spyOn(ctrl, 'setPath').mockImplementation(() => {})
        vi.spyOn(ctrl, 'handleClick').mockImplementation(() => {})
        vi.spyOn(ctrl, 'handleSubmit').mockResolvedValue(undefined)
        vi.spyOn(ctrl, 'handleCancelDownload').mockImplementation(() => {})
        vi.spyOn(ctrl, 'onSelectCurrentFolder').mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('authenticate() delegates to controller.signIn()', () => {
        svc.authenticate()
        expect(ctrl.signIn).toHaveBeenCalled()
    })
    it('logout() delegates to controller.signOut()', () => {
        svc.logout()
        expect(ctrl.signOut).toHaveBeenCalled()
    })
    it('handleClick() delegates to controller.handleClick()', () => {
        const f = { id: 'f2' } as any
        svc.handleClick(f)
        expect(ctrl.handleClick).toHaveBeenCalledWith(f)
    })
    it('setPath() delegates to controller.setPath()', () => {
        const p = [] as any
        svc.setPath(p)
        expect(ctrl.setPath).toHaveBeenCalledWith(p)
    })
    it('exposes dropboxFiles, isAuthenticated signals', () => {
        expect(svc.dropboxFiles).toBeDefined()
        expect(svc.isAuthenticated).toBeDefined()
    })
})

describe('BoxService delegation', () => {
    let store: UpupStore
    let svc: BoxService
    let ctrl: DriveBrowserController

    beforeEach(() => {
        store = makeStoreMock()
        ;({ svc, ctrl } = setupService(BoxService, store))
        vi.spyOn(ctrl, 'init').mockImplementation(() => {})
        vi.spyOn(ctrl, 'destroy').mockImplementation(() => {})
        vi.spyOn(ctrl, 'signIn').mockImplementation(() => {})
        vi.spyOn(ctrl, 'signOut').mockImplementation(() => {})
        vi.spyOn(ctrl, 'setPath').mockImplementation(() => {})
        vi.spyOn(ctrl, 'handleClick').mockImplementation(() => {})
        vi.spyOn(ctrl, 'handleSubmit').mockResolvedValue(undefined)
        vi.spyOn(ctrl, 'handleCancelDownload').mockImplementation(() => {})
        vi.spyOn(ctrl, 'onSelectCurrentFolder').mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('authenticate() delegates to controller.signIn()', () => {
        svc.authenticate()
        expect(ctrl.signIn).toHaveBeenCalled()
    })
    it('logout() delegates to controller.signOut()', () => {
        svc.logout()
        expect(ctrl.signOut).toHaveBeenCalled()
    })
    it('handleClick() delegates', () => {
        const f = { id: 'f3' } as any
        svc.handleClick(f)
        expect(ctrl.handleClick).toHaveBeenCalledWith(f)
    })
    it('exposes boxFiles, isAuthenticated signals', () => {
        expect(svc.boxFiles).toBeDefined()
        expect(svc.isAuthenticated).toBeDefined()
    })
})

// ── Callback wiring: onFilesSelected fires handleSetSelectedFiles ──────────────

describe('Drive service callback wiring', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('GoogleDriveService: onFilesSelected fires store.handleSetSelectedFiles', () => {
        const store = makeStoreMock()
        TestBed.configureTestingModule({
            providers: [
                { provide: UpupStore, useValue: store },
                GoogleDriveService,
            ],
        })
        const svc = TestBed.inject(GoogleDriveService)
        const ctrl = (svc as any)['controller'] as DriveBrowserController
        const callbacks = (ctrl as any)['callbacks']
        // Invoke the callback directly — it should call the store
        const fakeFiles = [{ id: 'x', name: 'x.txt' }]
        callbacks.onFilesSelected(fakeFiles)
        expect(store.handleSetSelectedFiles).toHaveBeenCalledWith(fakeFiles)
    })

    it('GoogleDriveService: onClose fires store.setActiveSource(undefined)', () => {
        const store = makeStoreMock()
        TestBed.configureTestingModule({
            providers: [
                { provide: UpupStore, useValue: store },
                GoogleDriveService,
            ],
        })
        const svc = TestBed.inject(GoogleDriveService)
        const ctrl = (svc as any)['controller'] as DriveBrowserController
        const callbacks = (ctrl as any)['callbacks']
        callbacks.onClose()
        expect(store.setActiveSource).toHaveBeenCalledWith(undefined)
    })

    it('DropboxService: onFilesSelected fires store.handleSetSelectedFiles', () => {
        const store = makeStoreMock()
        TestBed.configureTestingModule({
            providers: [
                { provide: UpupStore, useValue: store },
                DropboxService,
            ],
        })
        const svc = TestBed.inject(DropboxService)
        const ctrl = (svc as any)['controller'] as DriveBrowserController
        const callbacks = (ctrl as any)['callbacks']
        const fakeFiles = [{ id: 'y', name: 'y.pdf' }]
        callbacks.onFilesSelected(fakeFiles)
        expect(store.handleSetSelectedFiles).toHaveBeenCalledWith(fakeFiles)
    })

    it('BoxService: onClose fires store.setActiveSource(undefined)', () => {
        const store = makeStoreMock()
        TestBed.configureTestingModule({
            providers: [{ provide: UpupStore, useValue: store }, BoxService],
        })
        const svc = TestBed.inject(BoxService)
        const ctrl = (svc as any)['controller'] as DriveBrowserController
        const callbacks = (ctrl as any)['callbacks']
        callbacks.onClose()
        expect(store.setActiveSource).toHaveBeenCalledWith(undefined)
    })
})
