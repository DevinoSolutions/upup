import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import DriveAuthFallback from '../src/components/shared/DriveAuthFallback'
import { driveErrorText } from '../src/lib/driveErrorText'
import type { DriveBrowserError, UiTranslations } from '@useupup/core'

// Same isolation as drive-browser-error-loadmore.test.tsx: DriveAuthFallback
// reads useUploaderTheme/useUploaderI18n directly, so mocking those two is the
// smallest surface that renders it outside a full <UpupUploader/> tree.
vi.mock('../src/context/UploaderContext', () => ({
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

describe('DriveAuthFallback — a declined consent is not reported as a popup block (#390)', () => {
    it('auto-triggers sign-in once on mount when no error is present, because the tile click still carries a user activation', () => {
        const onRetry = vi.fn()

        render(<DriveAuthFallback providerName="OneDrive" onRetry={onRetry} />)

        expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('does NOT auto-trigger sign-in when an error is passed, so the second activation-less window.open that produced the false popup-blocked report never happens', () => {
        const onRetry = vi.fn()

        render(
            <DriveAuthFallback
                providerName="OneDrive"
                onRetry={onRetry}
                error={{
                    message: 'OneDrive sign-in was cancelled (access_denied)',
                    action: 'authenticateViaPopup',
                    messageKey: 'authCancelled',
                }}
            />,
        )

        expect(onRetry).not.toHaveBeenCalled()
    })

    it('does not auto-trigger again when the view remounts carrying the previous attempt error', () => {
        const onRetry = vi.fn()
        const declined: DriveBrowserError = {
            message: 'OneDrive sign-in was cancelled (popup-closed)',
            messageKey: 'authCancelled',
        }

        const first = render(
            <DriveAuthFallback providerName="OneDrive" onRetry={onRetry} />,
        )
        expect(onRetry).toHaveBeenCalledTimes(1)
        first.unmount()

        render(
            <DriveAuthFallback
                providerName="OneDrive"
                onRetry={onRetry}
                error={declined}
            />,
        )

        expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('shows the translated cancellation sentence rather than the plugin diagnostic when the outcome is a decline', () => {
        const { getByTestId } = render(
            <DriveAuthFallback
                providerName="OneDrive"
                onRetry={vi.fn()}
                error={{
                    message: 'OneDrive sign-in was cancelled (access_denied)',
                    messageKey: 'authCancelled',
                }}
            />,
        )

        const alert = getByTestId('upup-drive-error')
        expect(alert.textContent).toBe(
            "Couldn't load files: Sign-in was cancelled",
        )
        expect(alert.textContent).not.toContain('access_denied')
        expect(alert.textContent).not.toContain('Popup')
    })

    it('still says popup blocked for a real popup block, using the translated key rather than the English literal', () => {
        const { getByTestId } = render(
            <DriveAuthFallback
                providerName="OneDrive"
                onRetry={vi.fn()}
                error={{
                    message: 'Popup was blocked by the browser',
                    messageKey: 'popupBlocked',
                }}
            />,
        )

        expect(getByTestId('upup-drive-error').textContent).toBe(
            "Couldn't load files: Popup blocked",
        )
    })

    it('keeps the plugin message verbatim for an error the controller did not recognise, so detail is not thrown away', () => {
        const { getByTestId } = render(
            <DriveAuthFallback
                providerName="OneDrive"
                onRetry={vi.fn()}
                error={{
                    message: 'Token exchange failed: 400 invalid_grant',
                    action: 'authenticate',
                }}
            />,
        )

        expect(getByTestId('upup-drive-error').textContent).toBe(
            "Couldn't load files: Token exchange failed: 400 invalid_grant",
        )
    })
})

describe('driveErrorText — which sentence wins (#390)', () => {
    const tr = {
        popupBlocked: 'Popup blocked',
        authCancelled: 'Sign-in was cancelled',
    } as unknown as UiTranslations

    it('prefers the translated string named by messageKey over the English message', () => {
        expect(
            driveErrorText(
                {
                    message: 'Popup was blocked by the browser',
                    messageKey: 'authCancelled',
                },
                tr,
            ),
        ).toBe('Sign-in was cancelled')
    })

    it('falls back to the message when no messageKey was set', () => {
        expect(driveErrorText({ message: 'Drive API error (500)' }, tr)).toBe(
            'Drive API error (500)',
        )
    })
})
