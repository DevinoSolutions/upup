import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import DriveBrowser from '../src/components/shared/DriveBrowser'

// DriveBrowser reads useUploaderOptions/useUploaderTheme/useUploaderI18n directly
// (not via the top-level <UpupUploader/> tree) — mocking just those three hooks
// is the smallest surface that lets this shared component render in isolation,
// matching how DriveBrowserHeader/DriveBrowserItem stay untouched (no `user` or
// items passed, so their early-return / empty-map paths keep them out of scope).
vi.mock('../src/context/UploaderContext', () => ({
    useUploaderOptions: () => ({
        allowedFileTypes: '*',
        icons: { LoaderIcon: () => <div data-testid="loader-icon" /> },
    }),
    useUploaderTheme: () => ({
        isDark: false,
        slotOverrides: {},
    }),
    useUploaderI18n: () => ({
        translations: {
            noAcceptedFilesFound: 'No accepted files found',
            selectThisFolder: 'Select this folder',
            addFiles_one: 'Add 1 file',
            addFiles_other: 'Add {{count}} files',
            cancel: 'Cancel',
            driveLoadError: "Couldn't load files: {{message}}",
            loadMore: 'Load more',
            loading: 'Loading…',
        },
    }),
    useUploaderSource: () => ({ setActiveSource: vi.fn() }),
}))

const emptyFolder = {
    id: 'root',
    name: 'Drive',
    path: '',
    size: 0,
    mimeType: '',
    isFolder: true as const,
    children: [],
}

describe('DriveBrowser — error banner + load-more (F-124, F-125)', () => {
    it('renders the error banner and suppresses the loader when error is set', () => {
        const { container, queryByTestId } = render(
            <DriveBrowser
                driveFiles={emptyFolder}
                path={[emptyFolder]}
                setPath={() => {}}
                handleSignOut={async () => {}}
                handleClick={() => {}}
                selectedFiles={[]}
                showLoader={false}
                handleSubmit={async () => {}}
                handleCancelDownload={() => {}}
                error={{ message: 'nope' }}
            />,
        )

        const banner = container.querySelector(
            '[data-testid="upup-drive-error"]',
        )
        expect(banner).not.toBeNull()
        expect(banner?.textContent).toContain('nope')
        expect(banner?.getAttribute('role')).toBe('alert')
        // The error short-circuits the perpetual loader (the exact F-123/F-124 symptom).
        expect(queryByTestId('loader-icon')).toBeNull()
    })

    it('renders the load-more button and calls loadMore on click', () => {
        const loadMore = vi.fn()
        const { container } = render(
            <DriveBrowser
                driveFiles={emptyFolder}
                path={[emptyFolder]}
                setPath={() => {}}
                handleSignOut={async () => {}}
                handleClick={() => {}}
                selectedFiles={[]}
                showLoader={false}
                handleSubmit={async () => {}}
                handleCancelDownload={() => {}}
                hasMore
                isLoadingMore={false}
                loadMore={loadMore}
            />,
        )

        const button = container.querySelector(
            '[data-testid="upup-drive-load-more"]',
        )
        expect(button).not.toBeNull()
        fireEvent.click(button as Element)
        expect(loadMore).toHaveBeenCalledTimes(1)
    })

    it('does not render the load-more button when hasMore is false', () => {
        const { container } = render(
            <DriveBrowser
                driveFiles={emptyFolder}
                path={[emptyFolder]}
                setPath={() => {}}
                handleSignOut={async () => {}}
                handleClick={() => {}}
                selectedFiles={[]}
                showLoader={false}
                handleSubmit={async () => {}}
                handleCancelDownload={() => {}}
                hasMore={false}
            />,
        )

        expect(
            container.querySelector('[data-testid="upup-drive-load-more"]'),
        ).toBeNull()
    })
})
