import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import UpupUploader from '../src/upup-uploader.vue'

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
