/**
 * drives.spec.ts — T13 component test suite
 *
 * Tests:
 *   - DriveAuthFallback: renders sign-in text with {{provider}} resolved (double-brace)
 *   - DriveBrowser: renders N DriveBrowserItems; click delegates correctly
 *   - ClientGoogleDriveUploader: renders auth fallback when not authed, browser when authed
 *   - ClientDropboxUploader / Box / OneDrive: same auth-fallback routing
 *
 * Real OAuth is never triggered.  Service state is driven by Angular computed signals
 * injected via TestBed `providers` overrides so no real controller init fires.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { Injectable, signal, computed } from '@angular/core'
import { type DriveFile, type DriveFolder, type DriveUser } from '@upup/core'
import { type DriveBrowserState } from '@upup/core/internal'
import { UpupStore } from '../upup-store.service'
import { DriveAuthFallbackComponent } from './shared/drive-auth-fallback.component'
import { DriveBrowserComponent } from './shared/drive-browser.component'
import { DriveBrowserItemComponent } from './shared/drive-browser-item.component'
import { ClientGoogleDriveUploaderComponent } from './client-google-drive-uploader.component'
import { ClientDropboxUploaderComponent } from './client-dropbox-uploader.component'
import { ClientBoxUploaderComponent } from './client-box-uploader.component'
import { ClientOneDriveUploaderComponent } from './client-one-drive-uploader.component'
import { GoogleDriveService } from '../services/google-drive.service'
import { DropboxService } from '../services/dropbox.service'
import { BoxService } from '../services/box.service'
import { OneDriveService } from '../services/one-drive.service'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal UpupStore mock covering all drive component reads. */
function makeStoreMock() {
    const slotOverrides = {
        driveHeader: '',
        driveSearchContainer: '',
        driveSearchInput: '',
        driveBody: '',
        driveFooter: '',
        driveAddFilesButton: '',
        driveCancelFilesButton: '',
        driveItemContainerDefault: '',
        driveItemContainerSelected: '',
        driveItemContainerInner: '',
        driveItemInnerText: '',
        sourceView: '',
        driveLoading: '',
    }
    const translations = {
        signOut: 'Sign out',
        search: 'Search',
        noAcceptedFilesFound: 'No files found',
        selectThisFolder: 'Select this folder',
        cancel: 'Cancel',
        authenticatePrompt: 'Sign in to access {{provider}}',
        signInWith: 'Sign in with {{provider}}',
        addFile: 'Add 1 file',
        addFiles: 'Add {{count}} files',
        addFile_plural: 'Add {{count}} files',
    }
    return {
        core: {},
        isDark: signal(false),
        slotOverrides: signal(slotOverrides),
        translations: signal(translations),
        uiProps: { allowedFileTypes: '*' },
        handleSetSelectedFiles: vi.fn().mockResolvedValue(undefined),
        setActiveSource: vi.fn(),
    } as unknown as UpupStore
}

// ── Fake drive services (replace real services in component DI) ───────────────

/**
 * Build a fake service class for a given state signal.
 * The client uploader components inject their service via providers: [ServiceCls],
 * which we override with a mock that exposes the same computed signals.
 */
function makeFakeGoogleDriveService(
    state: ReturnType<typeof signal<Partial<DriveBrowserState>>>,
) {
    @Injectable()
    class FakeGoogleDriveService {
        readonly token = computed(() => state().token)
        readonly authCancelled = computed(() => state().authCancelled ?? false)
        readonly isAuthReady = computed(() => state().isAuthReady ?? false)
        readonly user = computed(() => state().user)
        readonly googleFiles = computed(() => state().folder)
        readonly path = computed(() => state().path ?? [])
        readonly selectedFiles = computed(() => state().selectedFiles ?? [])
        readonly showLoader = computed(() => state().showLoader ?? false)
        readonly isClickLoading = computed(
            () => state().isClickLoading ?? false,
        )
        init = vi.fn()
        destroy = vi.fn()
        retryAuth = vi.fn()
        handleSignOut = vi.fn()
        setPath = vi.fn()
        handleClick = vi.fn()
        handleSubmit = vi.fn().mockResolvedValue(undefined)
        handleCancelDownload = vi.fn()
        onSelectCurrentFolder = vi.fn()
    }
    return FakeGoogleDriveService
}

function makeFakeDropboxService(
    state: ReturnType<typeof signal<Partial<DriveBrowserState>>>,
) {
    const filesSignal = computed(() => state().folder)
    @Injectable()
    class FakeDropboxService {
        readonly isAuthenticated = computed(
            () => state().isAuthenticated ?? false,
        )
        readonly isLoading = computed(() => state().isLoading ?? true)
        readonly token = computed(() =>
            state().isAuthenticated
                ? ('active' as unknown as ReturnType<DropboxService['token']>)
                : undefined,
        )
        readonly user = computed(() => state().user)
        readonly dropboxFiles = filesSignal
        readonly path = computed(() => state().path ?? [])
        readonly selectedFiles = computed(() => state().selectedFiles ?? [])
        readonly showLoader = computed(() => state().showLoader ?? false)
        readonly isClickLoading = computed(
            () => state().isClickLoading ?? false,
        )
        init = vi.fn()
        destroy = vi.fn()
        authenticate = vi.fn()
        signIn = vi.fn()
        signOut = vi.fn()
        logout = vi.fn()
        handleSignOut = vi.fn()
        setPath = vi.fn()
        handleClick = vi.fn()
        handleSubmit = vi.fn().mockResolvedValue(undefined)
        handleCancelDownload = vi.fn()
        onSelectCurrentFolder = vi.fn()
    }
    return FakeDropboxService
}

function makeFakeBoxService(
    state: ReturnType<typeof signal<Partial<DriveBrowserState>>>,
) {
    const filesSignal = computed(() => state().folder)
    @Injectable()
    class FakeBoxService {
        readonly isAuthenticated = computed(
            () => state().isAuthenticated ?? false,
        )
        readonly isLoading = computed(() => state().isLoading ?? true)
        readonly token = computed(() =>
            state().isAuthenticated
                ? ('active' as unknown as ReturnType<BoxService['token']>)
                : undefined,
        )
        readonly user = computed(() => state().user)
        readonly boxFiles = filesSignal
        readonly path = computed(() => state().path ?? [])
        readonly selectedFiles = computed(() => state().selectedFiles ?? [])
        readonly showLoader = computed(() => state().showLoader ?? false)
        readonly isClickLoading = computed(
            () => state().isClickLoading ?? false,
        )
        init = vi.fn()
        destroy = vi.fn()
        authenticate = vi.fn()
        signIn = vi.fn()
        signOut = vi.fn()
        logout = vi.fn()
        handleSignOut = vi.fn()
        setPath = vi.fn()
        handleClick = vi.fn()
        handleSubmit = vi.fn().mockResolvedValue(undefined)
        handleCancelDownload = vi.fn()
        onSelectCurrentFolder = vi.fn()
    }
    return FakeBoxService
}

function makeFakeOneDriveService(
    state: ReturnType<typeof signal<Partial<DriveBrowserState>>>,
) {
    const filesSignal = computed(() => state().folder)
    @Injectable()
    class FakeOneDriveService {
        readonly isAuthenticated = computed(
            () => state().isAuthenticated ?? false,
        )
        readonly isLoading = computed(() => state().isLoading ?? true)
        readonly token = computed(() =>
            state().isAuthenticated
                ? ('active' as unknown as ReturnType<OneDriveService['token']>)
                : undefined,
        )
        readonly user = computed(() => state().user)
        readonly oneDriveFiles = filesSignal
        readonly path = computed(() => state().path ?? [])
        readonly selectedFiles = computed(() => state().selectedFiles ?? [])
        readonly showLoader = computed(() => state().showLoader ?? false)
        readonly isClickLoading = computed(
            () => state().isClickLoading ?? false,
        )
        init = vi.fn()
        destroy = vi.fn()
        authenticate = vi.fn()
        signIn = vi.fn()
        signOut = vi.fn()
        logout = vi.fn()
        handleSignOut = vi.fn()
        setPath = vi.fn()
        handleClick = vi.fn()
        handleSubmit = vi.fn().mockResolvedValue(undefined)
        handleCancelDownload = vi.fn()
        onSelectCurrentFolder = vi.fn()
    }
    return FakeOneDriveService
}

// ── DriveAuthFallback ─────────────────────────────────────────────────────────

describe('DriveAuthFallbackComponent', () => {
    let store: ReturnType<typeof makeStoreMock>

    beforeEach(async () => {
        store = makeStoreMock()
        await TestBed.configureTestingModule({
            imports: [DriveAuthFallbackComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()
    })

    afterEach(() => TestBed.resetTestingModule())

    it('resolves {{provider}} in "Google Drive" — no literal placeholder in DOM', () => {
        const fixture = TestBed.createComponent(DriveAuthFallbackComponent)
        fixture.componentInstance.providerName = 'Google Drive'
        fixture.componentInstance.onRetry = () => {
            /* noop */
        }
        fixture.detectChanges()

        const text = fixture.nativeElement.textContent as string
        expect(text).toContain('Google Drive')
        expect(text).toContain('Sign in')
        expect(text).not.toContain('{{provider}}')
    })

    it('resolves {{provider}} for "Dropbox"', () => {
        const fixture = TestBed.createComponent(DriveAuthFallbackComponent)
        fixture.componentInstance.providerName = 'Dropbox'
        fixture.componentInstance.onRetry = () => {
            /* noop */
        }
        fixture.detectChanges()

        const text = fixture.nativeElement.textContent as string
        expect(text).toContain('Dropbox')
        expect(text).not.toContain('{{provider}}')
    })

    it('resolves {{provider}} for "OneDrive"', () => {
        const fixture = TestBed.createComponent(DriveAuthFallbackComponent)
        fixture.componentInstance.providerName = 'OneDrive'
        fixture.componentInstance.onRetry = () => {
            /* noop */
        }
        fixture.detectChanges()

        expect(fixture.nativeElement.textContent).toContain('OneDrive')
        expect(fixture.nativeElement.textContent).not.toContain('{{provider}}')
    })

    it('resolves {{provider}} for "Box"', () => {
        const fixture = TestBed.createComponent(DriveAuthFallbackComponent)
        fixture.componentInstance.providerName = 'Box'
        fixture.componentInstance.onRetry = () => {
            /* noop */
        }
        fixture.detectChanges()

        expect(fixture.nativeElement.textContent).toContain('Box')
        expect(fixture.nativeElement.textContent).not.toContain('{{provider}}')
    })

    it('calls onRetry when sign-in button is clicked', () => {
        const fixture = TestBed.createComponent(DriveAuthFallbackComponent)
        const onRetry = vi.fn()
        fixture.componentInstance.providerName = 'Google Drive'
        fixture.componentInstance.onRetry = onRetry
        fixture.detectChanges()

        const button = fixture.nativeElement.querySelector(
            'button',
        ) as HTMLButtonElement
        button.click()
        expect(onRetry).toHaveBeenCalledOnce()
    })

    it('does NOT render data-testid="upup-server-drive-browser"', () => {
        const fixture = TestBed.createComponent(DriveAuthFallbackComponent)
        fixture.componentInstance.providerName = 'Google Drive'
        fixture.componentInstance.onRetry = () => {
            /* noop */
        }
        fixture.detectChanges()

        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-server-drive-browser"]',
            ),
        ).toBeNull()
    })
})

// ── DriveBrowserItem ──────────────────────────────────────────────────────────

describe('DriveBrowserItemComponent', () => {
    let store: ReturnType<typeof makeStoreMock>

    beforeEach(async () => {
        store = makeStoreMock()
        await TestBed.configureTestingModule({
            imports: [DriveBrowserItemComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()
    })

    afterEach(() => TestBed.resetTestingModule())

    function mountItem(file: DriveFile, selected: DriveFile[] = []) {
        const fixture = TestBed.createComponent(DriveBrowserItemComponent)
        fixture.componentInstance.file = file
        fixture.componentInstance.handleClick = vi.fn()
        fixture.componentInstance.selectedFiles = selected
        fixture.detectChanges()
        return fixture
    }

    it('renders file name', () => {
        const file = {
            id: 'f1',
            name: 'report.pdf',
            isFolder: false,
            mimeType: 'application/pdf',
        } as DriveFile
        const fixture = mountItem(file)
        expect(fixture.nativeElement.textContent).toContain('report.pdf')
    })

    it('has data-upup-slot="drive-browser-item"', () => {
        const file = {
            id: 'f1',
            name: 'a.txt',
            isFolder: false,
            mimeType: 'text/plain',
        } as DriveFile
        const fixture = mountItem(file)
        expect(
            fixture.nativeElement.querySelector(
                '[data-upup-slot="drive-browser-item"]',
            ),
        ).not.toBeNull()
    })

    it('calls handleClick with the file on click', () => {
        const file = {
            id: 'f1',
            name: 'doc.pdf',
            isFolder: false,
            mimeType: 'application/pdf',
        } as DriveFile
        const fixture = mountItem(file)
        const handleClick = fixture.componentInstance.handleClick as ReturnType<
            typeof vi.fn
        >

        const el = fixture.nativeElement.querySelector(
            '[data-upup-slot="drive-browser-item"]',
        ) as HTMLElement
        el.click()
        expect(handleClick).toHaveBeenCalledWith(file)
    })

    it('adds selected class when file is in selectedFiles', () => {
        const file = {
            id: 'f1',
            name: 'a.txt',
            isFolder: false,
            mimeType: 'text/plain',
        } as DriveFile
        const fixture = mountItem(file, [file])
        const el = fixture.nativeElement.querySelector(
            '[data-upup-slot="drive-browser-item"]',
        ) as HTMLElement
        expect(el.className).toContain('upup-bg-[#bab4b499]')
    })
})

// ── DriveBrowser ──────────────────────────────────────────────────────────────

describe('DriveBrowserComponent', () => {
    let store: ReturnType<typeof makeStoreMock>

    beforeEach(async () => {
        store = makeStoreMock()
        await TestBed.configureTestingModule({
            imports: [DriveBrowserComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()
    })

    afterEach(() => TestBed.resetTestingModule())

    function makeFolder(children: DriveFile[] = []): DriveFolder {
        return {
            id: 'root',
            name: 'Drive',
            isFolder: true,
            children,
        } as DriveFolder
    }

    function mountWithItems(items: DriveFile[]) {
        const root = makeFolder(items)
        const pathSig = signal([root])
        const driveFilesSig = signal<DriveFolder | undefined>(root)

        const fixture = TestBed.createComponent(DriveBrowserComponent)
        const comp = fixture.componentInstance
        comp.driveFiles = driveFilesSig
        comp.path = pathSig
        comp.setPath = vi.fn()
        comp.user = signal<DriveUser | undefined>(undefined)
        comp.handleSignOut = vi.fn()
        comp.handleClick = vi.fn()
        comp.selectedFiles = signal<DriveFile[]>([])
        comp.showLoader = signal(false)
        comp.handleSubmit = vi.fn().mockResolvedValue(undefined)
        comp.handleCancelDownload = vi.fn()
        comp.isClickLoading = signal(false)
        fixture.detectChanges()
        return fixture
    }

    it('renders data-testid="upup-drive-browser" when driveFiles is set', () => {
        const fixture = mountWithItems([])
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-drive-browser"]',
            ),
        ).not.toBeNull()
    })

    it('renders N DriveBrowserItem elements for N files', () => {
        const items = [
            {
                id: 'f1',
                name: 'a.txt',
                isFolder: false,
                mimeType: 'text/plain',
            },
            {
                id: 'f2',
                name: 'b.pdf',
                isFolder: false,
                mimeType: 'application/pdf',
            },
            {
                id: 'f3',
                name: 'c.jpg',
                isFolder: false,
                mimeType: 'image/jpeg',
            },
        ] as DriveFile[]
        const fixture = mountWithItems(items)

        const rendered = fixture.nativeElement.querySelectorAll(
            '[data-upup-slot="drive-browser-item"]',
        )
        expect(rendered.length).toBe(3)
    })

    it('renders 0 DriveBrowserItems when folder is empty', () => {
        const fixture = mountWithItems([])
        const rendered = fixture.nativeElement.querySelectorAll(
            '[data-upup-slot="drive-browser-item"]',
        )
        expect(rendered.length).toBe(0)
    })

    it('clicking a file calls handleClick with the file', () => {
        const file = {
            id: 'f1',
            name: 'doc.pdf',
            isFolder: false,
            mimeType: 'application/pdf',
        } as DriveFile
        const fixture = mountWithItems([file])
        const comp = fixture.componentInstance

        const itemEl = fixture.nativeElement.querySelector(
            '[data-upup-slot="drive-browser-item"]',
        ) as HTMLElement
        itemEl.click()
        expect(comp.handleClick).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'f1' }),
        )
    })
})

// ── ClientGoogleDriveUploader ─────────────────────────────────────────────────

describe('ClientGoogleDriveUploaderComponent', () => {
    afterEach(() => TestBed.resetTestingModule())

    function mountWithState(statePartial: Partial<DriveBrowserState>) {
        const store = makeStoreMock()
        const stateSig = signal<Partial<DriveBrowserState>>(statePartial)
        const FakeService = makeFakeGoogleDriveService(stateSig)

        TestBed.configureTestingModule({
            imports: [ClientGoogleDriveUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        })
        // Override the component-level providers: [GoogleDriveService] so our fake wins
        TestBed.overrideComponent(ClientGoogleDriveUploaderComponent, {
            set: {
                providers: [
                    { provide: GoogleDriveService, useClass: FakeService },
                ],
            },
        })
        const fixture = TestBed.createComponent(
            ClientGoogleDriveUploaderComponent,
        )
        fixture.detectChanges()
        return { fixture, stateSig }
    }

    it('renders DriveAuthFallback (no upup-drive-browser) when not authed and authCancelled=true', () => {
        const { fixture } = mountWithState({
            isAuthReady: true,
            authCancelled: true,
            token: undefined,
        })
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-drive-browser"]',
            ),
        ).toBeNull()
        expect(fixture.nativeElement.textContent).toContain('Google Drive')
    })

    it('renders DriveAuthFallback when isAuthReady=true and no token', () => {
        const { fixture } = mountWithState({
            isAuthReady: true,
            authCancelled: false,
            token: undefined,
        })
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-drive-browser"]',
            ),
        ).toBeNull()
    })

    it('renders upup-drive-browser when token is present', () => {
        const folder: DriveFolder = {
            id: 'root',
            name: 'Drive',
            path: '/',
            size: 0,
            mimeType: '',
            children: [],
            isFolder: true,
        }
        const { fixture } = mountWithState({
            token: { access_token: 'tok', expires_in: 3600 },
            path: [folder],
            folder,
            user: { id: 'u1', name: 'User' } as DriveUser,
        })
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-drive-browser"]',
            ),
        ).not.toBeNull()
    })

    it('DriveAuthFallback does not contain {{provider}} in text', () => {
        const { fixture } = mountWithState({
            isAuthReady: true,
            authCancelled: true,
            token: undefined,
        })
        expect(fixture.nativeElement.textContent).not.toContain('{{provider}}')
    })
})

// ── ClientDropboxUploader ─────────────────────────────────────────────────────

describe('ClientDropboxUploaderComponent', () => {
    afterEach(() => TestBed.resetTestingModule())

    function mountWithState(statePartial: Partial<DriveBrowserState>) {
        const store = makeStoreMock()
        const stateSig = signal<Partial<DriveBrowserState>>(statePartial)
        const FakeService = makeFakeDropboxService(stateSig)

        TestBed.configureTestingModule({
            imports: [ClientDropboxUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        })
        TestBed.overrideComponent(ClientDropboxUploaderComponent, {
            set: {
                providers: [{ provide: DropboxService, useClass: FakeService }],
            },
        })
        const fixture = TestBed.createComponent(ClientDropboxUploaderComponent)
        fixture.detectChanges()
        return fixture
    }

    it('renders auth fallback with "Dropbox" when not authenticated', () => {
        const fixture = mountWithState({
            isAuthenticated: false,
            isLoading: false,
        })
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-drive-browser"]',
            ),
        ).toBeNull()
        expect(fixture.nativeElement.textContent).toContain('Dropbox')
        expect(fixture.nativeElement.textContent).not.toContain('{{provider}}')
    })

    it('renders upup-drive-browser when authenticated', () => {
        const folder: DriveFolder = {
            id: 'root',
            name: 'Dropbox',
            path: '/',
            size: 0,
            mimeType: '',
            children: [],
            isFolder: true,
        }
        const fixture = mountWithState({
            isAuthenticated: true,
            isLoading: false,
            path: [folder],
            folder,
            user: { id: 'u1', name: 'User' } as DriveUser,
        })
        expect(
            fixture.nativeElement.querySelector(
                '[data-testid="upup-drive-browser"]',
            ),
        ).not.toBeNull()
    })
})

// ── ClientBoxUploader ─────────────────────────────────────────────────────────

describe('ClientBoxUploaderComponent', () => {
    afterEach(() => TestBed.resetTestingModule())

    function mountWithState(statePartial: Partial<DriveBrowserState>) {
        const store = makeStoreMock()
        const stateSig = signal<Partial<DriveBrowserState>>(statePartial)
        const FakeService = makeFakeBoxService(stateSig)

        TestBed.configureTestingModule({
            imports: [ClientBoxUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        })
        TestBed.overrideComponent(ClientBoxUploaderComponent, {
            set: {
                providers: [{ provide: BoxService, useClass: FakeService }],
            },
        })
        const fixture = TestBed.createComponent(ClientBoxUploaderComponent)
        fixture.detectChanges()
        return fixture
    }

    it('renders auth fallback with "Box" resolved — no {{provider}} in text', () => {
        const fixture = mountWithState({
            isAuthenticated: false,
            isLoading: false,
        })
        expect(fixture.nativeElement.textContent).toContain('Box')
        expect(fixture.nativeElement.textContent).not.toContain('{{provider}}')
    })
})

// ── ClientOneDriveUploader ────────────────────────────────────────────────────

describe('ClientOneDriveUploaderComponent', () => {
    afterEach(() => TestBed.resetTestingModule())

    function mountWithState(statePartial: Partial<DriveBrowserState>) {
        const store = makeStoreMock()
        const stateSig = signal<Partial<DriveBrowserState>>(statePartial)
        const FakeService = makeFakeOneDriveService(stateSig)

        TestBed.configureTestingModule({
            imports: [ClientOneDriveUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        })
        TestBed.overrideComponent(ClientOneDriveUploaderComponent, {
            set: {
                providers: [
                    { provide: OneDriveService, useClass: FakeService },
                ],
            },
        })
        const fixture = TestBed.createComponent(ClientOneDriveUploaderComponent)
        fixture.detectChanges()
        return fixture
    }

    it('renders auth fallback with "OneDrive" resolved — no {{provider}} in text', () => {
        const fixture = mountWithState({
            isAuthenticated: false,
            isLoading: false,
        })
        expect(fixture.nativeElement.textContent).toContain('OneDrive')
        expect(fixture.nativeElement.textContent).not.toContain('{{provider}}')
    })
})
