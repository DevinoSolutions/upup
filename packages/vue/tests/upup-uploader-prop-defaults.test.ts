import { describe, it, expect, beforeAll, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import UpupUploader from '../src/upup-uploader.vue'
import { useUploaderOptions } from '../src/context/uploader-context'

// jsdom has no matchMedia; ThemeStore.init() (run from the uploader's onMounted)
// subscribes to prefers-color-scheme, so without a stub mount() throws.
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
    // jsdom has no ResizeObserver; UploaderPanel's file list measures its scroll
    // container (tiles-per-row) via one, so the real-panel branding mount below
    // needs a stub. The measurement is a no-op here — no files, no layout.
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    )
})

// Probe rendered inside the uploader's default slot: reads the resolved option
// context and writes the values onto data-attributes for DOM assertions. Lives in
// the slot so the heavy UploaderPanel (virtual-list) subtree is not rendered.
const OptionsProbe = defineComponent({
    name: 'OptionsProbe',
    setup() {
        const opts = useUploaderOptions()
        return () =>
            h('div', {
                'data-testid': 'opts-probe',
                'data-allow-preview': String(opts.allowPreview),
                'data-show-branding': String(opts.showBranding),
            })
    },
})

describe('UpupUploader boolean-prop defaults (Vue Boolean-coercion parity)', () => {
    // Regression for the Vue-only divergence: `defineProps<{ allowPreview?: boolean }>()`
    // makes Vue type the prop as Boolean, so an ABSENT prop is coerced to `false`,
    // defeating the intended `true` default that React/Svelte/Angular/Vanilla resolve.
    // `withDefaults(...)` in upup-uploader.vue restores parity for the intended-true
    // booleans (allowPreview, showBranding, webWorker).
    it('resolves allowPreview/showBranding to true when the props are omitted', () => {
        const wrapper = mount(UpupUploader, {
            slots: { default: () => h(OptionsProbe) },
        })
        const probe = wrapper.find('[data-testid="opts-probe"]')
        expect(probe.exists()).toBe(true)
        expect(probe.attributes('data-allow-preview')).toBe('true')
        expect(probe.attributes('data-show-branding')).toBe('true')
        wrapper.unmount()
    })

    it('renders the branding block when showBranding is omitted (not coerced off)', () => {
        // Branding now renders INSIDE UploaderPanel (gated on no active source /
        // no files), so mount the real panel — no slot override — with an empty
        // uploader. Absent showBranding must still resolve true and paint it.
        const wrapper = mount(UpupUploader)
        expect(wrapper.find('[data-testid="upup-branding"]').exists()).toBe(
            true,
        )
        wrapper.unmount()
    })
})
