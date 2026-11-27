import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import UpupUploader from '../src/upup-uploader.vue'
import { useUploaderFiles } from '../src/context/uploader-context'

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

// Rendered in the uploader's default slot so the heavy panel subtree stays
// out of the way; it reads the queue straight from the real uploader context.
const QueueProbe = defineComponent({
    name: 'QueueProbe',
    setup() {
        const { files } = useUploaderFiles()
        return () =>
            h(
                'ul',
                { 'data-testid': 'queue-probe' },
                [...files.value.values()].map(f => h('li', f.name)),
            )
    },
})

const makeFile = (name: string, bytes: number, type: string) =>
    new File(['x'.repeat(bytes)], name, { type })

async function pick(wrapper: VueWrapper, files: File[]) {
    const input = wrapper.find('[data-testid="upup-file-input"]')
    Object.defineProperty(input.element, 'files', {
        value: files,
        configurable: true,
    })
    await input.trigger('change')
    await flushPromises()
}

const queued = (wrapper: VueWrapper) =>
    wrapper.findAll('[data-testid="queue-probe"] li').map(li => li.text())

describe('the Vue uploader passes the refusal reason through', () => {
    it('reports a too-large file named Unlimited_CV.pdf as FILE_TOO_LARGE', async () => {
        const onRestrictionFailed = vi.fn()
        const wrapper = mount(UpupUploader, {
            props: {
                maxFileSize: { size: 1, unit: 'KB' },
                onRestrictionFailed,
            },
            slots: { default: () => h(QueueProbe) },
        })
        const cv = makeFile('Unlimited_CV.pdf', 2048, 'application/pdf')

        await pick(wrapper, [cv])

        expect(onRestrictionFailed).toHaveBeenCalledTimes(1)
        expect(onRestrictionFailed).toHaveBeenCalledWith(cv, 'FILE_TOO_LARGE')
        wrapper.unmount()
    })

    it('reports an over-total batch as TOTAL_SIZE_EXCEEDED', async () => {
        const onRestrictionFailed = vi.fn()
        const wrapper = mount(UpupUploader, {
            props: {
                maxTotalFileSize: { size: 3, unit: 'KB' },
                onRestrictionFailed,
            },
            slots: { default: () => h(QueueProbe) },
        })
        const first = makeFile('a.pdf', 2048, 'application/pdf')

        await pick(wrapper, [first, makeFile('b.pdf', 2048, 'application/pdf')])

        expect(onRestrictionFailed).toHaveBeenCalledWith(
            first,
            'TOTAL_SIZE_EXCEEDED',
        )
        expect(queued(wrapper)).toEqual([])
        wrapper.unmount()
    })
})

describe('a mixed drop in the Vue uploader', () => {
    it('queues the png and reports the zip and the exe one message each', async () => {
        const onError = vi.fn()
        const onRestrictionFailed = vi.fn()
        const wrapper = mount(UpupUploader, {
            props: {
                allowedFileTypes: 'image/*',
                onError,
                onRestrictionFailed,
            },
            slots: { default: () => h(QueueProbe) },
        })
        const zip = makeFile('bundle.zip', 4, 'application/zip')
        const exe = makeFile('setup.exe', 4, 'application/x-msdownload')
        const png = makeFile('photo.png', 4, 'image/png')

        await pick(wrapper, [zip, exe, png])

        expect(queued(wrapper)).toEqual(['photo.png'])
        expect(onError.mock.calls).toEqual([
            ['File type "application/zip" is not accepted'],
            ['File type "application/x-msdownload" is not accepted'],
        ])
        expect(onRestrictionFailed.mock.calls).toEqual([
            [zip, 'TYPE_MISMATCH'],
            [exe, 'TYPE_MISMATCH'],
        ])
        wrapper.unmount()
    })
})
