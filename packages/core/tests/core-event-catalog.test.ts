import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upup/shared'

/**
 * Catalog test: ensures every documented UpupCore event can be emitted
 * and received via the public on()/emit() API.
 */
describe('UpupCore — event catalog', () => {
    const events = [
        // Lifecycle
        'ready', 'destroyed', 'options-updated',
        // Files
        'files-added', 'file-removed', 'files-cleared', 'files-set',
        'files-reordered', 'files-synced', 'files-replaced',
        'file-replaced', 'file-rejected',
        // Upload flow
        'upload-start', 'upload-progress', 'upload-success',
        'upload-all-complete', 'upload-error',
        'upload-pause', 'upload-resume', 'upload-cancel',
        'file-upload-start', 'retry',
        // State
        'state-change', 'status-synced',
        'snapshot-restored', 'crash-recovery-restored',
        // Restrictions
        'restriction-failed',
        // UI interactions
        'adapter-click', 'adapter-view-cancel',
        'browse-files', 'folder-select',
        'drag-over', 'drag-leave', 'drop', 'paste',
        'url-submit', 'url-fetch',
        'camera-capture', 'camera-confirm',
        'file-preview-open', 'file-preview-close',
        // Image editor
        'image-editor-open', 'image-editor-save', 'image-editor-cancel',
        // State bridges
        'view-mode-change', 'theme-change', 'locale-change',
        'limit-change', 'adding-more', 'adapter-change',
        'source-change', 'total-progress-change',
        'upload-metrics', 'editor-queue-change',
        'editing-file-change', 'upload-error-change',
        'files-count-change', 'progress-map-change',
        'connection-online', 'connection-offline',
        // Cloud providers
        'gdrive-auth-success', 'gdrive-sign-out',
        'gdrive-files-submit', 'gdrive-cancel',
        'gdrive-folder-submit', 'gdrive-download-error',
        'gdrive-api-error', 'gdrive-auth-error', 'gdrive-auth-popup-error',
        'gdrive-submit-error', 'gdrive-folder-submit-error', 'gdrive-folder-select-error',
        'dropbox-auth-success', 'dropbox-files-submit', 'dropbox-cancel',
        'dropbox-folder-submit', 'dropbox-download-error', 'dropbox-folder-error',
        'dropbox-api-error', 'dropbox-init-error',
        'dropbox-session-expired', 'dropbox-user-info-error', 'dropbox-no-token',
        'dropbox-submit-error', 'dropbox-folder-submit-error', 'dropbox-folder-select-error',
        'dropbox-auth-profile-error', 'dropbox-auth-poll-error',
        'dropbox-auth-token-refreshed', 'dropbox-auth-refresh-error',
        'dropbox-auth-config-error', 'dropbox-auth-popup-blocked',
        'dropbox-auth-logout', 'dropbox-files-loaded',
        'onedrive-auth-success', 'onedrive-auth-logout',
        'onedrive-graph-ready', 'onedrive-files-submit', 'onedrive-cancel',
        'onedrive-folder-submit', 'onedrive-download-error',
        'onedrive-graph-error', 'onedrive-init-error',
        'onedrive-msal-ready', 'onedrive-msal-error', 'onedrive-msal-config-error',
        'onedrive-auth-error', 'onedrive-auth-logout-error',
        'onedrive-auth-silent-error', 'onedrive-auth-init-error', 'onedrive-auth-signin-error',
        'onedrive-folder-fetch-error', 'onedrive-graph-not-ready', 'onedrive-folder-select-error',
        'onedrive-submit-error', 'onedrive-folder-submit-error',
        // Misc
        'warn', 'done', 'auto-upload', 'prepare-files',
        'state-reset', 'compression-error',
    ]

    it(`catalog contains ${events.length} event types`, () => {
        expect(events.length).toBeGreaterThan(80)
    })

    it('all catalog events are unique', () => {
        expect(new Set(events).size).toBe(events.length)
    })

    it('all catalog events can be emitted and received via on()/emit()', () => {
        const core = new UpupCore({})
        for (const event of events) {
            const handler = vi.fn()
            core.on(event, handler)
            core.emit(event, { test: true })
            expect(handler).toHaveBeenCalledWith({ test: true })
        }
        core.destroy()
    })

    it('unsubscribing prevents reception for all catalog events', () => {
        const core = new UpupCore({})
        for (const event of events) {
            const handler = vi.fn()
            const unsub = core.on(event, handler)
            unsub()
            core.emit(event, { test: true })
            expect(handler).not.toHaveBeenCalled()
        }
        core.destroy()
    })
})
