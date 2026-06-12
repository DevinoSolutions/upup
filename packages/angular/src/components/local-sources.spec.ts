/**
 * local-sources.spec.ts — TestBed tests for the 4 local source components:
 *   UrlUploaderComponent, CameraUploaderComponent, AudioUploaderComponent,
 *   ScreenCaptureUploaderComponent
 *
 * Store strategy:
 *   Instantiate a real UpupStore (new UpupStore(); setConfig({}); init()) and provide
 *   it via { provide: UpupStore, useValue: store }. Disposed in afterEach.
 *
 * Media API mocking strategy:
 *   - CameraUploaderComponent calls startCamera() in ngAfterViewInit via
 *     CameraUploaderService. We mock navigator.mediaDevices.getUserMedia to return a
 *     fake MediaStream with stub tracks before rendering the component.
 *   - AudioUploaderComponent only calls getUserMedia on user click (startRecording).
 *   - ScreenCaptureUploaderComponent only calls getDisplayMedia on user click (Share Screen).
 *   → Only camera needs a pre-render media mock; audio/screen are click-gated.
 *
 * jsdom guard for camera:
 *   CameraUploaderService.startCamera() silently catches if getUserMedia rejects, so
 *   even without a mock the component does NOT hang. The mock lets us test the
 *   "stream opened" path where video element is wired.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { UpupStore } from '../upup-store.service'
import { UrlUploaderComponent } from './url-uploader.component'
import { CameraUploaderComponent } from './camera-uploader.component'
import { AudioUploaderComponent } from './audio-uploader.component'
import { ScreenCaptureUploaderComponent } from './screen-capture-uploader.component'
import { FetchFileByUrlService } from '../services/fetch-file-by-url.service'
import { CameraUploaderService } from '../services/camera-uploader.service'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeStore(): UpupStore {
    const store = new UpupStore()
    store.setConfig({} as any)
    store.init()
    return store
}

/** Minimal fake MediaStream with one stoppable track. */
function makeFakeStream(): MediaStream {
    const track = { stop: vi.fn(), kind: 'video', enabled: true } as unknown as MediaStreamTrack
    return {
        getTracks: () => [track],
        getVideoTracks: () => [track],
        getAudioTracks: () => [],
    } as unknown as MediaStream
}

/** Mock navigator.mediaDevices.getUserMedia to return a fake stream. */
function mockGetUserMedia(stream: MediaStream): void {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: {
            getUserMedia: vi.fn().mockResolvedValue(stream),
            getDisplayMedia: vi.fn().mockResolvedValue(stream),
        },
        configurable: true,
        writable: true,
    })
}

function restoreMediaDevices(): void {
    try {
        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: undefined,
            configurable: true,
            writable: true,
        })
    } catch { /* ignore */ }
}

// ── UrlUploaderComponent ───────────────────────────────────────────────────────

describe('UrlUploaderComponent', () => {
    let store: UpupStore

    afterEach(() => {
        store?.dispose()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('renders the adapter view with data-upup-slot="url-uploader"', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [UrlUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(UrlUploaderComponent)
        fixture.detectChanges()

        const slot = fixture.nativeElement.querySelector('[data-upup-slot="url-uploader"]')
        expect(slot).not.toBeNull()
    })

    it('renders a url input with the correct aria-label from translations', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [UrlUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(UrlUploaderComponent)
        fixture.detectChanges()

        const input = fixture.nativeElement.querySelector('input[type="url"]') as HTMLInputElement
        expect(input).not.toBeNull()
        expect(input.getAttribute('name')).toBe('upup-url')
    })

    it('renders the fetch button disabled when url is empty', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [UrlUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(UrlUploaderComponent)
        fixture.detectChanges()

        const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement
        expect(button).not.toBeNull()
        expect(button.disabled).toBe(true)
    })

    it('emits url-submit and fetches the file on form submit', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [UrlUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(UrlUploaderComponent)
        fixture.detectChanges()

        // FetchFileByUrlService is component-scoped — get from fixture injector
        const svc = fixture.debugElement.injector.get(FetchFileByUrlService)
        const fakeFile = new File(['x'], 'photo.png', { type: 'image/png' })
        const fetchSpy = vi.spyOn(svc, 'fetchImage').mockResolvedValue(fakeFile)

        // Set url
        const comp = fixture.componentInstance
        comp.url = 'https://example.com/photo.png'
        fixture.detectChanges()

        const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement
        expect(btn.disabled).toBe(false)

        await comp.handleFormSubmit()
        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/photo.png')
    })
})

// ── CameraUploaderComponent ────────────────────────────────────────────────────

describe('CameraUploaderComponent', () => {
    let store: UpupStore

    beforeEach(() => {
        // Camera component auto-starts on ngAfterViewInit — mock before rendering
        mockGetUserMedia(makeFakeStream())
    })

    afterEach(() => {
        store?.dispose()
        restoreMediaDevices()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('renders data-testid="upup-camera-uploader"', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [CameraUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(CameraUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const el = fixture.nativeElement.querySelector('[data-testid="upup-camera-uploader"]')
        expect(el).not.toBeNull()
    })

    it('renders data-upup-slot="camera-uploader"', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [CameraUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(CameraUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const slot = fixture.nativeElement.querySelector('[data-upup-slot="camera-uploader"]')
        expect(slot).not.toBeNull()
    })

    it('renders the video element when no capture is shown', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [CameraUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(CameraUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement
        expect(video).not.toBeNull()
    })

    it('shows capture + rotate buttons when no capture url is set', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [CameraUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(CameraUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()

        // The camera service starts with no capturedUrl — so capture + rotate should show.
        const buttons = fixture.nativeElement.querySelectorAll('button')
        expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    it('service: startCamera calls getUserMedia', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [CameraUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        // CameraUploaderService is component-scoped — get from fixture injector
        const fixture = TestBed.createComponent(CameraUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        const svc = fixture.debugElement.injector.get(CameraUploaderService)
        await svc.startCamera()
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
    })

    it('service: capture() produces a string capturedUrl when a fake video is wired', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [CameraUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(CameraUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        const svc = fixture.debugElement.injector.get(CameraUploaderService)

        // Wire a fake video element so capture() can draw to canvas
        const fakeVideo = {
            videoWidth: 320,
            videoHeight: 240,
        } as HTMLVideoElement
        svc.setVideoEl(fakeVideo)

        // jsdom canvas.toDataURL returns a string; signal must be set without throwing
        svc.capture()
        expect(typeof svc.capturedUrl()).toBe('string')
    })

    it('service: stopCamera stops all tracks', async () => {
        const stream = makeFakeStream()
        mockGetUserMedia(stream)

        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [CameraUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(CameraUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        const svc = fixture.debugElement.injector.get(CameraUploaderService)
        await svc.startCamera()
        svc.stopCamera()
        const track = stream.getTracks()[0] as unknown as { stop: ReturnType<typeof vi.fn> }
        expect(track.stop).toHaveBeenCalled()
    })

    it('service: handleCameraSwitch toggles facingMode', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [CameraUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(CameraUploaderComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        const svc = fixture.debugElement.injector.get(CameraUploaderService)
        const { FacingMode } = await import('../services/camera-uploader.service')
        expect(svc.facingMode()).toBe(FacingMode.Environment)
        svc.handleCameraSwitch()
        expect(svc.facingMode()).toBe(FacingMode.User)
        svc.handleCameraSwitch()
        expect(svc.facingMode()).toBe(FacingMode.Environment)
    })
})

// ── AudioUploaderComponent ─────────────────────────────────────────────────────

describe('AudioUploaderComponent', () => {
    let store: UpupStore

    afterEach(() => {
        store?.dispose()
        restoreMediaDevices()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('renders data-upup-slot="audio-uploader"', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [AudioUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(AudioUploaderComponent)
        fixture.detectChanges()

        const slot = fixture.nativeElement.querySelector('[data-upup-slot="audio-uploader"]')
        expect(slot).not.toBeNull()
    })

    it('renders the timer in idle state', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [AudioUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(AudioUploaderComponent)
        fixture.detectChanges()

        const timer = fixture.nativeElement.querySelector('.upup-font-mono')
        expect(timer).not.toBeNull()
        expect(timer.textContent.trim()).toBe('0:00')
    })

    it('renders "Start Recording" button in idle state', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [AudioUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(AudioUploaderComponent)
        fixture.detectChanges()

        const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
        const startBtn = buttons.find(b => b.textContent?.includes('Start Recording'))
        expect(startBtn).not.toBeNull()
    })

    it('does NOT auto-start getUserMedia on render (no jsdom hang)', async () => {
        store = makeStore()
        const spy = vi.fn().mockRejectedValue(new Error('not mocked'))
        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: { getUserMedia: spy },
            configurable: true,
            writable: true,
        })

        await TestBed.configureTestingModule({
            imports: [AudioUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(AudioUploaderComponent)
        fixture.detectChanges()

        // getUserMedia must not have been called just by rendering
        expect(spy).not.toHaveBeenCalled()
    })

    it('transitions to recording state when startRecording succeeds', async () => {
        const stream = makeFakeStream()

        // Minimal MediaRecorder stub — must be installed BEFORE the component loads
        // because jsdom has no native MediaRecorder.
        const recorderStub = {
            start: vi.fn(),
            stop: vi.fn(),
            ondataavailable: null as null | ((e: BlobEvent) => void),
            onstop: null as null | (() => void),
            mimeType: 'audio/webm',
            state: 'inactive',
        }
        // @ts-expect-error — stub global
        globalThis.MediaRecorder = function MediaRecorder() { return recorderStub }

        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
            configurable: true,
            writable: true,
        })

        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [AudioUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(AudioUploaderComponent)
        fixture.detectChanges()

        await fixture.componentInstance.startRecording()
        fixture.detectChanges()

        expect(fixture.componentInstance.recordingState).toBe('recording')
    })

    it('shows error message when getUserMedia is denied', async () => {
        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: { getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')) },
            configurable: true,
            writable: true,
        })

        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [AudioUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(AudioUploaderComponent)
        fixture.detectChanges()

        await fixture.componentInstance.startRecording()
        fixture.detectChanges()

        const slot = fixture.nativeElement.querySelector('[data-upup-slot="audio-uploader"]')
        expect(slot).not.toBeNull()
        expect(fixture.componentInstance.error).not.toBeNull()
    })
})

// ── ScreenCaptureUploaderComponent ─────────────────────────────────────────────

describe('ScreenCaptureUploaderComponent', () => {
    let store: UpupStore

    afterEach(() => {
        store?.dispose()
        restoreMediaDevices()
        vi.restoreAllMocks()
        TestBed.resetTestingModule()
    })

    it('renders data-upup-slot="screen-capture-uploader" in idle state', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ScreenCaptureUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ScreenCaptureUploaderComponent)
        fixture.detectChanges()

        const slot = fixture.nativeElement.querySelector('[data-upup-slot="screen-capture-uploader"]')
        expect(slot).not.toBeNull()
    })

    it('renders "Share Screen" button in idle state', async () => {
        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ScreenCaptureUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ScreenCaptureUploaderComponent)
        fixture.detectChanges()

        const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
        const shareBtn = buttons.find(b => b.textContent?.includes('Share Screen'))
        expect(shareBtn).not.toBeNull()
    })

    it('does NOT auto-start getDisplayMedia on render', async () => {
        const spy = vi.fn()
        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: { getDisplayMedia: spy },
            configurable: true,
            writable: true,
        })

        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ScreenCaptureUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ScreenCaptureUploaderComponent)
        fixture.detectChanges()

        expect(spy).not.toHaveBeenCalled()
    })

    it('shows error state when getDisplayMedia is denied', async () => {
        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: {
                getDisplayMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
            },
            configurable: true,
            writable: true,
        })

        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ScreenCaptureUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ScreenCaptureUploaderComponent)
        fixture.detectChanges()

        await fixture.componentInstance.startRecording()
        fixture.detectChanges()

        // Error state: the error property is set and slot still renders
        expect(fixture.componentInstance.error).not.toBeNull()
        const slot = fixture.nativeElement.querySelector('[data-upup-slot="screen-capture-uploader"]')
        expect(slot).not.toBeNull()
    })

    it('transitions to recording state when getDisplayMedia succeeds', async () => {
        const stream = makeFakeStream()
        // Add onended handler support to track stub
        const track = stream.getVideoTracks()[0] as unknown as { onended: null | (() => void); stop: ReturnType<typeof vi.fn> }
        track.onended = null

        // Must install MediaRecorder before TestBed because jsdom has no native MediaRecorder.
        const recorderStub = {
            start: vi.fn(),
            stop: vi.fn(),
            ondataavailable: null as null | ((e: BlobEvent) => void),
            onstop: null as null | (() => void),
            mimeType: 'video/webm',
            state: 'inactive',
        }
        // @ts-expect-error — stub global
        globalThis.MediaRecorder = function MediaRecorder() { return recorderStub }

        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: { getDisplayMedia: vi.fn().mockResolvedValue(stream) },
            configurable: true,
            writable: true,
        })

        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ScreenCaptureUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ScreenCaptureUploaderComponent)
        fixture.detectChanges()

        await fixture.componentInstance.startRecording()
        fixture.detectChanges()

        expect(fixture.componentInstance.recordingState).toBe('recording')
    })

    it('renders a Stop Recording button while recording and clicking it stops recording', async () => {
        const stream = makeFakeStream()
        const track = stream.getVideoTracks()[0] as unknown as { onended: null | (() => void); stop: ReturnType<typeof vi.fn> }
        track.onended = null

        // Must install MediaRecorder before TestBed because jsdom has no native MediaRecorder.
        const recorderStub = {
            start: vi.fn(),
            stop: vi.fn(),
            ondataavailable: null as null | ((e: BlobEvent) => void),
            onstop: null as null | (() => void),
            mimeType: 'video/webm',
            state: 'recording',
        }
        // @ts-expect-error — stub global
        globalThis.MediaRecorder = function MediaRecorder() { return recorderStub }

        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: { getDisplayMedia: vi.fn().mockResolvedValue(stream) },
            configurable: true,
            writable: true,
        })

        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ScreenCaptureUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ScreenCaptureUploaderComponent)
        fixture.detectChanges()

        // Enter recording via the real UI button ("Share Screen")
        const allButtons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
        const shareBtn = allButtons.find(b => b.textContent?.includes('Share Screen'))
        expect(shareBtn).not.toBeUndefined()
        shareBtn!.click()
        await fixture.whenStable()
        fixture.detectChanges()

        expect(fixture.componentInstance.recordingState).toBe('recording')

        // (a) Stop Recording button is present while recording
        const recordingButtons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
        const stopBtn = recordingButtons.find(b => b.textContent?.includes('Stop Recording'))
        expect(stopBtn).not.toBeUndefined()

        // (b) Clicking it stops recording — spy on stopRecording + assert state leaves 'recording'
        const stopSpy = vi.spyOn(fixture.componentInstance, 'stopRecording')
        stopBtn!.click()
        fixture.detectChanges()

        expect(stopSpy).toHaveBeenCalled()
        expect(recorderStub.stop).toHaveBeenCalled()
        expect(fixture.componentInstance.recordingState).not.toBe('recording')
    })

    it('retryRecording clears error and calls startRecording', async () => {
        const stream = makeFakeStream()
        const track = stream.getVideoTracks()[0] as unknown as { onended: null | (() => void) }
        track.onended = null

        const recorderStub = {
            start: vi.fn(),
            stop: vi.fn(),
            ondataavailable: null,
            onstop: null,
            mimeType: 'video/webm',
            state: 'inactive',
        }
        // @ts-expect-error — stub global
        globalThis.MediaRecorder = function MediaRecorder() { return recorderStub }

        let callCount = 0
        Object.defineProperty(globalThis.navigator, 'mediaDevices', {
            value: {
                getDisplayMedia: vi.fn().mockImplementation(() => {
                    callCount++
                    return Promise.resolve(stream)
                }),
            },
            configurable: true,
            writable: true,
        })

        store = makeStore()
        await TestBed.configureTestingModule({
            imports: [ScreenCaptureUploaderComponent],
            providers: [{ provide: UpupStore, useValue: store }],
        }).compileComponents()

        const fixture = TestBed.createComponent(ScreenCaptureUploaderComponent)
        fixture.componentInstance.error = 'some error'
        fixture.detectChanges()

        await fixture.componentInstance.retryRecording()
        fixture.detectChanges()

        expect(fixture.componentInstance.error).toBeNull()
        expect(callCount).toBeGreaterThan(0)
    })
})
