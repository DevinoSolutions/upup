import { render } from '@testing-library/svelte'
import Harness from './fixtures/UseUpupUploadHarness.svelte'
import type {
    UseUpupUploadOptions,
    UseUpupUploadReturn,
} from '../src/use-upup-upload'

/**
 * Svelte counterpart to @upupjs/vue's tests/helpers.ts `withSetup`. Svelte's
 * onMount/onDestroy only run inside a real component instance (there is no
 * bare `setup()` callback the way Vue's Composition API offers), so this
 * mounts useUpupUpload through a tiny harness component instead of calling
 * it directly. `@testing-library/svelte`'s mount/unmount both wrap
 * `Svelte.flushSync`, so onMount/onDestroy have already run by the time this
 * function returns/unmount() resolves — no `await act()` needed.
 */
export function withSetup(options: UseUpupUploadOptions): {
    result: UseUpupUploadReturn
    unmount: () => void
} {
    const sink: { result?: UseUpupUploadReturn } = {}
    const { unmount } = render(Harness, { options, sink })
    return { result: sink.result as UseUpupUploadReturn, unmount }
}
