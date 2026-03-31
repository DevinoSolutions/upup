import {
    fileGetIsVideo,
    generateThumbnailForFile,
} from '../../frontend/lib/file'
import { FileWithParams } from '../../shared/types'

const originalOffscreenCanvas = (globalThis as any).OffscreenCanvas
const originalCreateElement = document.createElement.bind(document)

const drawImage = jest.fn()
const convertToBlob = jest.fn(
    async () => new Blob(['thumb'], { type: 'image/jpeg' }),
)

describe('file thumbnail helpers', () => {
    let createElementSpy: jest.SpyInstance

    beforeEach(() => {
        drawImage.mockClear()
        convertToBlob.mockClear()

        class MockOffscreenCanvas {
            constructor(
                public width: number,
                public height: number,
            ) {}

            getContext() {
                return {
                    drawImage,
                }
            }

            async convertToBlob() {
                return await convertToBlob()
            }
        }

        ;(globalThis as any).OffscreenCanvas = MockOffscreenCanvas
    })

    afterEach(() => {
        createElementSpy?.mockRestore()
        ;(globalThis as any).OffscreenCanvas = originalOffscreenCanvas
    })

    it('detects video mime types', () => {
        expect(fileGetIsVideo('video/mp4')).toBe(true)
        expect(fileGetIsVideo('image/png')).toBe(false)
        expect(fileGetIsVideo('application/pdf')).toBe(false)
    })

    it('generates thumbnails for video files', async () => {
        const listeners = new Map<string, Set<() => void>>()
        const mockVideo = {
            preload: '',
            muted: false,
            playsInline: false,
            videoWidth: 1280,
            videoHeight: 720,
            pause: jest.fn(),
            load: jest.fn(),
            removeAttribute: jest.fn(),
            addEventListener: (type: string, listener: () => void) => {
                if (!listeners.has(type)) {
                    listeners.set(type, new Set())
                }
                listeners.get(type)!.add(listener)
            },
            removeEventListener: (type: string, listener: () => void) => {
                listeners.get(type)?.delete(listener)
            },
            dispatch(type: string) {
                listeners.get(type)?.forEach(listener => listener())
            },
        } as any

        Object.defineProperty(mockVideo, 'src', {
            set() {
                queueMicrotask(() => {
                    mockVideo.dispatch('loadeddata')
                })
            },
        })

        createElementSpy = jest
            .spyOn(document, 'createElement')
            .mockImplementation((tagName: string) => {
                if (tagName === 'video') {
                    return mockVideo
                }

                return originalCreateElement(tagName)
            })

        const file = new File(['video-bytes'], 'clip.mp4', {
            type: 'video/mp4',
        }) as FileWithParams
        file.id = 'clip-id'
        file.url = 'blob:http://localhost/clip'

        const result = await generateThumbnailForFile(file)

        expect(result.thumbnail?.file).toBeInstanceOf(File)
        expect(result.thumbnail?.file.name).toBe('thumb_clip.mp4')
        expect(result.thumbnail?.file.type).toBe('image/jpeg')
        expect(drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 200, 113)
        expect(convertToBlob).toHaveBeenCalledTimes(1)
        expect(mockVideo.pause).toHaveBeenCalledTimes(1)
        expect(mockVideo.removeAttribute).toHaveBeenCalledWith('src')
        expect(mockVideo.load).toHaveBeenCalledTimes(1)
    })
})
