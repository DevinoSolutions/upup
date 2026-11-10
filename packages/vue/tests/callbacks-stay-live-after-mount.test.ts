import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { shallowReactive } from 'vue'
import { FileSource, UploadStatus, type UploadFile } from '@useupup/core'
import UpupUploader from '../src/upup-uploader.vue'
import useUploaderController from '../src/composables/useUploaderController'
import type { UploaderProps } from '../src/shared/types'
import { withSetup } from './helpers'

beforeAll(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }))
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    )
})

afterEach(() => {
    vi.unstubAllGlobals()
})

const makeFile = (name: string, type: string) => new File(['x'], name, { type })

// Minimal EventSource stand-in: lets a test open and answer the server-processing
// stream without a network.
class FakeEventSource {
    static instances: FakeEventSource[] = []
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: (() => void) | null = null
    constructor(readonly url: string) {
        FakeEventSource.instances.push(this)
    }
    close() {}
    emit(data: string) {
        this.onmessage?.({ data } as MessageEvent)
    }
}

const uploadedFile = (key: string) =>
    ({
        id: key,
        name: 'photo.png',
        key,
        url: 'blob:x',
        source: FileSource.LOCAL,
        status: UploadStatus.SUCCESSFUL,
        metadata: {},
    }) as unknown as UploadFile

async function pick(wrapper: VueWrapper, files: File[]) {
    const input = wrapper.find('[data-testid="upup-file-input"]')
    Object.defineProperty(input.element, 'files', {
        value: files,
        configurable: true,
    })
    await input.trigger('change')
    await flushPromises()
}

describe('a callback swapped after the Vue uploader mounted', () => {
    it('reaches the new handler and never the old one for a refused file', async () => {
        const firstOnError = vi.fn()
        const firstOnRestrictionFailed = vi.fn()
        const firstOnFileTypeMismatch = vi.fn()
        const wrapper = mount(UpupUploader, {
            props: {
                allowedFileTypes: 'image/*',
                onError: firstOnError,
                onRestrictionFailed: firstOnRestrictionFailed,
                onFileTypeMismatch: firstOnFileTypeMismatch,
            },
        })
        const nextOnError = vi.fn()
        const nextOnRestrictionFailed = vi.fn()
        const nextOnFileTypeMismatch = vi.fn()
        await wrapper.setProps({
            onError: nextOnError,
            onRestrictionFailed: nextOnRestrictionFailed,
            onFileTypeMismatch: nextOnFileTypeMismatch,
        })
        const zip = makeFile('bundle.zip', 'application/zip')

        await pick(wrapper, [zip])

        expect(nextOnError).toHaveBeenCalledTimes(1)
        expect(nextOnRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(nextOnRestrictionFailed).toHaveBeenCalledWith(
            zip,
            'TYPE_MISMATCH',
        )
        expect(nextOnFileTypeMismatch).toHaveBeenCalledTimes(1)
        expect(firstOnError).not.toHaveBeenCalled()
        expect(firstOnRestrictionFailed).not.toHaveBeenCalled()
        expect(firstOnFileTypeMismatch).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('fires a handler that was absent at mount and added later, once', async () => {
        const wrapper = mount(UpupUploader, {
            props: { allowedFileTypes: 'image/*' },
        })
        const lateOnError = vi.fn()
        const lateOnRestrictionFailed = vi.fn()
        await wrapper.setProps({
            onError: lateOnError,
            onRestrictionFailed: lateOnRestrictionFailed,
        })
        const zip = makeFile('bundle.zip', 'application/zip')

        await pick(wrapper, [zip])

        expect(lateOnError).toHaveBeenCalledTimes(1)
        expect(lateOnRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(lateOnRestrictionFailed).toHaveBeenCalledWith(
            zip,
            'TYPE_MISMATCH',
        )
        wrapper.unmount()
    })
})

describe('a non-refusal callback swapped after the Vue uploader mounted', () => {
    it('reaches the new onFilesSelected and never the old one', async () => {
        const first = vi.fn()
        const wrapper = mount(UpupUploader, {
            props: { allowedFileTypes: 'image/*', onFilesSelected: first },
        })
        const next = vi.fn()
        await wrapper.setProps({ onFilesSelected: next })

        await pick(wrapper, [makeFile('photo.png', 'image/png')])

        expect(next).toHaveBeenCalledTimes(1)
        expect(first).not.toHaveBeenCalled()
        wrapper.unmount()
    })
})

describe('onBeforeFileAdded swapped after the Vue uploader mounted', () => {
    it('asks the new handler and never the old one', async () => {
        const first = vi.fn(() => undefined)
        const wrapper = mount(UpupUploader, {
            props: { allowedFileTypes: 'image/*', onBeforeFileAdded: first },
        })
        const next = vi.fn(() => undefined)
        await wrapper.setProps({ onBeforeFileAdded: next })
        const png = makeFile('photo.png', 'image/png')

        await pick(wrapper, [png])

        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledWith(png)
        expect(first).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('drops a file the new handler vetoes, sync or async', async () => {
        const onFilesSelected = vi.fn()
        const wrapper = mount(UpupUploader, {
            props: {
                allowedFileTypes: 'image/*',
                onFilesSelected,
                onBeforeFileAdded: () => undefined,
            },
        })
        await wrapper.setProps({ onBeforeFileAdded: () => false })
        await pick(wrapper, [makeFile('a.png', 'image/png')])
        await wrapper.setProps({
            onBeforeFileAdded: () => Promise.resolve(false),
        })
        await pick(wrapper, [makeFile('b.png', 'image/png')])

        expect(onFilesSelected).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('admits the file the new handler substitutes', async () => {
        const onFilesSelected = vi.fn()
        const wrapper = mount(UpupUploader, {
            props: {
                allowedFileTypes: 'image/*',
                onFilesSelected,
                onBeforeFileAdded: () => undefined,
            },
        })
        await wrapper.setProps({
            onBeforeFileAdded: () => makeFile('renamed.png', 'image/png'),
        })

        await pick(wrapper, [makeFile('photo.png', 'image/png')])

        expect(onFilesSelected).toHaveBeenCalledTimes(1)
        expect(onFilesSelected.mock.calls[0]![0][0].name).toBe('renamed.png')
        wrapper.unmount()
    })

    it('applies a handler that was absent at mount and added later', async () => {
        const onFilesSelected = vi.fn()
        const wrapper = mount(UpupUploader, {
            props: { allowedFileTypes: 'image/*', onFilesSelected },
        })
        const late = vi.fn(() => false as const)
        await wrapper.setProps({ onBeforeFileAdded: late })

        await pick(wrapper, [makeFile('photo.png', 'image/png')])

        expect(late).toHaveBeenCalledTimes(1)
        expect(onFilesSelected).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('admits files as before when no handler was ever set', async () => {
        const onFilesSelected = vi.fn()
        const wrapper = mount(UpupUploader, {
            props: { allowedFileTypes: 'image/*', onFilesSelected },
        })

        await pick(wrapper, [makeFile('photo.png', 'image/png')])

        expect(onFilesSelected).toHaveBeenCalledTimes(1)
        wrapper.unmount()
    })
})

describe('onFileProcessed swapped after the Vue uploader mounted', () => {
    // Finishing a file is what opens its processing stream; drive that through
    // core's own event, with EventSource faked.
    function mountController(initial: Partial<UploaderProps>) {
        FakeEventSource.instances = []
        vi.stubGlobal('EventSource', FakeEventSource)
        const props = shallowReactive<UploaderProps>({
            processingEndpoint: '/api/processing',
            ...initial,
        })
        const { result, unmount } = withSetup(() =>
            useUploaderController(props),
        )
        const finish = (key: string) =>
            result.core!.emit('upload-all-complete', [uploadedFile(key)])
        return { props, finish, unmount }
    }

    it('reaches the new handler and never the old one', () => {
        const first = vi.fn()
        const { props, finish, unmount } = mountController({
            onFileProcessed: first,
        })
        const next = vi.fn()
        props.onFileProcessed = next

        finish('k1')
        FakeEventSource.instances[0]!.emit('{"status":"done"}')

        expect(next).toHaveBeenCalledTimes(1)
        expect(next.mock.calls[0]![1]).toEqual({ status: 'done' })
        expect(first).not.toHaveBeenCalled()
        unmount()
    })

    it('hands a stream already open to the handler in place when the message lands', () => {
        const first = vi.fn()
        const { props, finish, unmount } = mountController({
            onFileProcessed: first,
        })
        finish('k1')
        const next = vi.fn()
        props.onFileProcessed = next

        FakeEventSource.instances[0]!.emit('{"status":"done"}')

        expect(next).toHaveBeenCalledTimes(1)
        expect(first).not.toHaveBeenCalled()
        unmount()
    })

    it('listens for a handler that was absent at mount and added later', () => {
        const { props, finish, unmount } = mountController({})
        const late = vi.fn()
        props.onFileProcessed = late

        finish('k1')
        FakeEventSource.instances[0]!.emit('{"status":"done"}')

        expect(late).toHaveBeenCalledTimes(1)
        unmount()
    })

    it('opens no stream while there is no handler', () => {
        const { finish, unmount } = mountController({})

        finish('k1')

        expect(FakeEventSource.instances).toHaveLength(0)
        unmount()
    })
})
