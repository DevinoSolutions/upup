import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { UpupCore, OneDrivePlugin } from '@useupup/core'

/**
 * The regression that took `OneDrive adapter shows auth prompt` and
 * `Dropbox adapter shows auth prompt` down in the cross-framework E2E.
 *
 * Everything else in this PR's React suite stubs the drive hook, which is the
 * right isolation for the view but cannot see this: the defect lives in what the
 * REAL controller leaves behind when a popup attempt ends without a session, and
 * in what the view then does about it. So this mounts the real uploader over a
 * real `UpupCore` with a real `OneDrivePlugin`, and only `window.open` is faked.
 *
 * Two ways an attempt ends with no session, and the E2E hits the first:
 *
 *  - **No clientId.** The E2E app configures none, so `getAuthUrl()` THROWS
 *    `… client_id is not configured` and never emits. Nothing reached
 *    `state.error`.
 *  - **`window.open` refused.** Headless CI returns null, which the plugin both
 *    emits and throws.
 *
 * Before the fix, the first case left the state carrying no error at all. The
 * auth fallback opens one popup on mount — the tile click's user activation is
 * still live — and reads `error` to know an attempt already happened; its own ref
 * cannot, because clearing `isLoading` re-renders the uploader into its browser
 * branch and hands the remount a fresh ref. So it looped: mount, attempt,
 * unmount, remount, fast enough to peg the main thread. React never committed,
 * and the adapter slot the E2E waits for never appeared.
 *
 * Each case therefore asserts three things: the slot exists, it says why, and the
 * attempt happened a BOUNDED number of times.
 */

const SLOT = '[data-upup-slot="one-drive-uploader"]'

let setFiles: ReturnType<typeof vi.fn>
let setActiveSource: ReturnType<typeof vi.fn>
let core: UpupCore

vi.mock('../src/context/UploaderContext', () => ({
    useUploaderRuntime: () => ({ core, mode: 'client' }),
    useUploaderSource: () => ({ setActiveSource }),
    useUploaderFiles: () => ({ setFiles }),
    useUploaderTheme: () => ({ isDark: false, slotOverrides: {} }),
    useUploaderOptions: () => ({
        allowedFileTypes: undefined,
        icons: { LoaderIcon: () => <span data-testid="loader" /> },
    }),
    useUploaderI18n: () => ({
        translations: {
            driveLoadError: "Couldn't load files: {{message}}",
            authenticatePrompt: 'Sign in to {{provider}}',
            signInWith: 'Sign in with {{provider}}',
            popupBlocked: 'Popup blocked',
            authCancelled: 'Sign-in was cancelled',
        },
    }),
}))

const { default: OneDriveUploader } =
    await import('../src/components/OneDriveUploader')

/**
 * `window.open` refused, the shape headless CI hands back. Spied rather than
 * stubbed wholesale: replacing the global window takes jsdom's document with it,
 * and Testing Library then has nothing to render into.
 */
function refusePopups(): ReturnType<typeof vi.fn> {
    return vi
        .spyOn(window, 'open')
        .mockReturnValue(null) as unknown as ReturnType<typeof vi.fn>
}

/**
 * How many automatic attempts count as "not looping". One is the design; the
 * allowance is for a second that a React 18 double-invoked effect could produce
 * under StrictMode.
 */
const ATTEMPT_BUDGET = 2

/**
 * Mount over a real plugin, counting attempts and CAPPING them.
 *
 * The cap is what makes this a usable regression pin. The loop starves the
 * event loop, so without it the unfixed code hangs the whole run rather than
 * failing: vitest's own per-test timeout never fires, because the timer that
 * would fire it never gets a turn. Past the cap the stub returns a promise that
 * never settles, which parks `isLoading` at true, stops the remount cycle and
 * lets the assertion below report a number instead of a hang.
 */
function mountWith(config: { clientId?: string }): {
    open: ReturnType<typeof vi.fn>
    attempts: () => number
} {
    const open = refusePopups()
    const plugin = new OneDrivePlugin()
    plugin.configure(config as Parameters<OneDrivePlugin['configure']>[0])
    let attempts = 0
    const real = plugin.getAuthUrl.bind(plugin)
    vi.spyOn(plugin, 'getAuthUrl').mockImplementation(() => {
        attempts += 1
        if (attempts > ATTEMPT_BUDGET * 4) return new Promise<string>(() => {})
        return real()
    })
    core.use(plugin)
    return { open, attempts: () => attempts }
}

describe('a popup attempt that cannot produce a session still renders the OneDrive view (#390)', () => {
    beforeEach(() => {
        setFiles = vi.fn()
        setActiveSource = vi.fn()
        core = new UpupCore({})
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('renders the slot with the reason when no clientId is configured, the exact condition the E2E app runs under', async () => {
        const { attempts } = mountWith({})

        const { container, getByTestId } = render(<OneDriveUploader />)

        await waitFor(() =>
            expect(container.querySelector(SLOT)).not.toBeNull(),
        )
        await waitFor(() =>
            expect(getByTestId('upup-drive-error').textContent).toContain(
                'client_id is not configured',
            ),
        )
        // The loop pin. Unbounded, this cycle ran 131 times in four seconds
        // and pegged the renderer's main thread.
        expect(attempts()).toBeLessThanOrEqual(ATTEMPT_BUDGET)
    })

    it('renders the slot with the blocked-popup sentence when window.open is refused, as it is in headless CI', async () => {
        const { open } = mountWith({ clientId: 'one-drive-test-client' })

        const { container, getByTestId } = render(<OneDriveUploader />)

        await waitFor(() =>
            expect(container.querySelector(SLOT)).not.toBeNull(),
        )
        await waitFor(() =>
            expect(getByTestId('upup-drive-error').textContent).toBe(
                "Couldn't load files: Popup blocked",
            ),
        )
        expect(open.mock.calls.length).toBeLessThanOrEqual(ATTEMPT_BUDGET)
    })

    it('keeps the sign-in button reachable after the failed attempt, so the person can try again themselves', async () => {
        mountWith({})

        const { findByRole } = render(<OneDriveUploader />)

        expect(
            await findByRole('button', { name: 'Sign in with OneDrive' }),
        ).toBeTruthy()
    })
})
