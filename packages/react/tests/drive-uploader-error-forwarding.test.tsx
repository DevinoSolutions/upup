import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import type { DriveBrowserError } from '@useupup/core'

/**
 * The close on issue #390's actual regression surface.
 *
 * `drive-auth-decline-reporting.test.tsx` renders `DriveAuthFallback` and
 * `driveErrorText` directly, which proves the view and the string are right but
 * NOT that any uploader hands the error to them — delete `error={error}` from
 * all four uploaders and every case in that file still passes while the bug is
 * fully back. These render the real uploader with only its hook stubbed, so the
 * one line under test is the prop wiring itself.
 *
 * Every case asserts the DECLINE sentence, not merely that some text appeared:
 * a fallback that rendered `error.message` would read "…was cancelled
 * (access_denied)", so the `.not.toContain` arms fail on a half-fix too.
 */

const declined: DriveBrowserError = {
    message: 'Sign-in was cancelled (access_denied)',
    action: 'authenticateViaPopup',
    messageKey: 'authCancelled',
}

const oneDrive = vi.fn()
const dropbox = vi.fn()
const box = vi.fn()
const googleDrive = vi.fn()

vi.mock('../src/context/UploaderContext', () => ({
    useUploaderRuntime: () => ({ mode: 'client' }),
    useUploaderSource: () => ({ setActiveSource: vi.fn() }),
    useUploaderTheme: () => ({ isDark: false, slotOverrides: {} }),
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

vi.mock('../src/hooks/useOneDrive', () => ({ default: () => oneDrive() }))
vi.mock('../src/hooks/useDropbox', () => ({ useDropbox: () => dropbox() }))
vi.mock('../src/hooks/useBox', () => ({ useBox: () => box() }))
vi.mock('../src/hooks/useGoogleDrive', () => ({
    default: () => googleDrive(),
}))

const { default: OneDriveUploader } =
    await import('../src/components/OneDriveUploader')
const { default: DropboxUploader } =
    await import('../src/components/DropboxUploader')
const { default: BoxUploader } = await import('../src/components/BoxUploader')
const { default: GoogleDriveUploader } =
    await import('../src/components/GoogleDriveUploader')

/** The shape every drive hook returns, minus the fields each one renames. */
const baseState = {
    user: undefined,
    signOut: vi.fn(),
    logout: vi.fn(),
    handleSignOut: vi.fn(),
    authenticate: vi.fn(),
    retryAuth: vi.fn(),
    path: [],
    setPath: vi.fn(),
    isClickLoading: false,
    handleClick: vi.fn(),
    selectedFiles: [],
    showLoader: false,
    handleSubmit: vi.fn(),
    handleCancelDownload: vi.fn(),
    onSelectCurrentFolder: undefined,
    hasMore: false,
    isLoadingMore: false,
    loadMore: vi.fn(),
}

/**
 * Each uploader's un-authenticated state, spelled the way THAT hook spells it —
 * the popup three gate on `!isAuthenticated && !token && !isLoading`, Google on
 * `!token && (authCancelled || isAuthReady)`.
 */
const cases = [
    {
        name: 'OneDriveUploader',
        Component: OneDriveUploader,
        hook: oneDrive,
        state: {
            ...baseState,
            oneDriveFiles: undefined,
            token: undefined,
            isAuthenticated: false,
            isLoading: false,
        },
    },
    {
        name: 'DropboxUploader',
        Component: DropboxUploader,
        hook: dropbox,
        state: {
            ...baseState,
            dropboxFiles: undefined,
            token: undefined,
            isAuthenticated: false,
            isLoading: false,
        },
    },
    {
        name: 'BoxUploader',
        Component: BoxUploader,
        hook: box,
        state: {
            ...baseState,
            boxFiles: undefined,
            token: undefined,
            isAuthenticated: false,
            isLoading: false,
        },
    },
    {
        name: 'GoogleDriveUploader',
        Component: GoogleDriveUploader,
        hook: googleDrive,
        state: {
            ...baseState,
            googleFiles: undefined,
            token: undefined,
            authCancelled: true,
            isAuthReady: true,
        },
    },
] as const

describe('a declined consent reaches the sign-in screen from the uploader itself (#390)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it.each(cases)(
        '$name forwards the drive error to DriveAuthFallback, which renders the decline as a decline',
        ({ Component, hook, state }) => {
            hook.mockReturnValue({ ...state, error: declined })

            const { getByTestId } = render(<Component />)

            const alert = getByTestId('upup-drive-error')
            expect(alert.textContent).toBe(
                "Couldn't load files: Sign-in was cancelled",
            )
            // The literal the issue was filed about, and the raw diagnostic the
            // translated string replaces.
            expect(alert.textContent).not.toContain('Popup')
            expect(alert.textContent).not.toContain('access_denied')
        },
    )

    it.each(cases)(
        '$name renders no error region at all when the attempt has not failed, so the sign-in screen stays clean',
        ({ Component, hook, state }) => {
            hook.mockReturnValue({ ...state, error: undefined })

            const { queryByTestId } = render(<Component />)

            expect(queryByTestId('upup-drive-error')).toBeNull()
        },
    )

    it.each(cases)(
        '$name suppresses the one-shot auto sign-in once an attempt has failed, so no activation-less window.open follows',
        ({ Component, hook, state }) => {
            const onRetry = vi.fn()
            hook.mockReturnValue({
                ...state,
                authenticate: onRetry,
                retryAuth: onRetry,
                error: declined,
            })

            render(<Component />)

            expect(onRetry).not.toHaveBeenCalled()
        },
    )
})
