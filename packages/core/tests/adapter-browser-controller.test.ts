import { describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { AdapterBrowserController } from '../src/adapters/adapter-browser-controller'
import type { DriveFile } from '../src/adapters/types'
import {
    GOOGLE_DRIVE_DESCRIPTOR,
    ONE_DRIVE_DESCRIPTOR,
    DROPBOX_DESCRIPTOR,
    BOX_DESCRIPTOR,
} from '../src/adapters/drive-browser-descriptors'

describe('drive-browser descriptors', () => {
    it('one-drive uses the onedrive event prefix despite its one-drive plugin id', () => {
        expect(ONE_DRIVE_DESCRIPTOR.pluginId).toBe('one-drive')
        expect(ONE_DRIVE_DESCRIPTOR.eventPrefix).toBe('onedrive')
    })

    it('dropbox is path-based, the others are id-based', () => {
        expect(DROPBOX_DESCRIPTOR.folderKey).toBe('path')
        expect(GOOGLE_DRIVE_DESCRIPTOR.folderKey).toBe('id')
        expect(ONE_DRIVE_DESCRIPTOR.folderKey).toBe('id')
        expect(BOX_DESCRIPTOR.folderKey).toBe('id')
    })

    it('only google-drive uses gis auth + cached-children selection', () => {
        expect(GOOGLE_DRIVE_DESCRIPTOR.auth).toBe('gis')
        expect(GOOGLE_DRIVE_DESCRIPTOR.selectFolder).toBe('cached-children')
        for (const d of [ONE_DRIVE_DESCRIPTOR, DROPBOX_DESCRIPTOR, BOX_DESCRIPTOR]) {
            expect(d.auth).toBe('popup')
            expect(d.selectFolder).toBe('load-all')
        }
    })
})

/** Minimal in-memory plugin: satisfies AdapterPlugin, never hits network. */
class FakeDrivePlugin {
    name: string
    id: string
    authed = false
    constructor(id: string) {
        this.id = id
        this.name = id
    }
    setup(): void {}
    init(): void {}
    destroy(): void {}
    restoreSession(): boolean {
        return false
    }
    isAuthenticated(): boolean {
        return this.authed
    }
    getAccessToken(): string | null {
        return this.authed ? 'tok' : null
    }
    async getUserInfo() {
        return { name: 'Test User', email: 't@example.com' }
    }
    async loadFiles(): Promise<unknown> {
        return {}
    }
    async downloadFiles(files: DriveFile[]): Promise<File[]> {
        return files.map(f => new File([''], f.name))
    }
    async loadAllFilesInFolder(): Promise<DriveFile[]> {
        return []
    }
    async authenticate(): Promise<void> {
        this.authed = true
    }
    async authenticateViaPopup(): Promise<void> {
        this.authed = true
    }
    signOut(): void {
        this.authed = false
    }
    getConfig() {
        return {}
    }
}

function file(id: string, name: string, isFolder = false, path = ''): DriveFile {
    return { id, name, path, size: 0, mimeType: '', isFolder }
}

function setup(descriptor = GOOGLE_DRIVE_DESCRIPTOR, pluginId = descriptor.pluginId) {
    const core = new UpupCore({})
    const plugin = new FakeDrivePlugin(pluginId)
    core.use(plugin)
    const onFilesSelected = vi.fn()
    const onClose = vi.fn()
    const controller = new AdapterBrowserController(core, descriptor, {
        onFilesSelected,
        onClose,
    })
    controller.init()
    return { core, plugin, controller, onFilesSelected, onClose }
}

describe('AdapterBrowserController — events', () => {
    it('files-loaded builds the Drive root folder (google, id-based)', () => {
        const { core, controller } = setup()
        core.emit('google-drive:files-loaded', {
            files: [file('1', 'a.txt')],
            folderId: 'root',
        })
        const snap = controller.getSnapshot()
        expect(snap.folder?.name).toBe('Drive')
        expect(snap.folder?.id).toBe('root')
        expect(snap.folder?.children).toHaveLength(1)
        expect(snap.isClickLoading).toBe(false)
    })

    it('files-loaded respects the onedrive event prefix (one-drive plugin id)', () => {
        const { core, controller } = setup(ONE_DRIVE_DESCRIPTOR)
        core.emit('onedrive:files-loaded', { files: [], folderId: 'root' })
        expect(controller.getSnapshot().folder?.name).toBe('OneDrive')
    })

    it('files-loaded handles dropbox path-based folders', () => {
        const { core, controller } = setup(DROPBOX_DESCRIPTOR)
        core.emit('dropbox:files-loaded', { files: [], path: '/Photos/Vacation' })
        const snap = controller.getSnapshot()
        expect(snap.folder?.name).toBe('Vacation')
        expect(snap.folder?.id).toBe('/Photos/Vacation')
        expect(snap.folder?.path).toBe('/Photos/Vacation')
    })

    it('files-loaded labels the box root by its 0 id', () => {
        const { core, controller } = setup(BOX_DESCRIPTOR)
        core.emit('box:files-loaded', { files: [], folderId: '0' })
        expect(controller.getSnapshot().folder?.name).toBe('Box')
    })

    it('signed-out clears user/folder/token (regression for the emitter wiring fix)', () => {
        const { core, controller } = setup()
        core.emit('google-drive:files-loaded', { files: [file('1', 'a')], folderId: 'root' })
        core.emit('google-drive:signed-out', {})
        const snap = controller.getSnapshot()
        expect(snap.folder).toBeUndefined()
        expect(snap.user).toBeUndefined()
        expect(snap.token).toBeUndefined()
        expect(snap.isAuthenticated).toBe(false)
    })

    it('gis state-change only toggles isClickLoading on browsing', () => {
        const { core, controller } = setup()
        core.emit('google-drive:state-change', { state: 'browsing' })
        expect(controller.getSnapshot().isClickLoading).toBe(true)
    })

    it('popup state-change drives isLoading on authenticating/browsing', () => {
        const { core, controller } = setup(ONE_DRIVE_DESCRIPTOR)
        core.emit('onedrive:state-change', { state: 'authenticating' })
        expect(controller.getSnapshot().isLoading).toBe(true)
        core.emit('onedrive:state-change', { state: 'idle' })
        expect(controller.getSnapshot().isLoading).toBe(false)
    })

    it('popup authenticated sets isAuthenticated + clears isLoading', () => {
        const { core, controller } = setup(BOX_DESCRIPTOR)
        core.emit('box:authenticated', { user: { name: 'Jo' } })
        const snap = controller.getSnapshot()
        expect(snap.isAuthenticated).toBe(true)
        expect(snap.isLoading).toBe(false)
        expect(snap.user?.name).toBe('Jo')
    })
})

describe('AdapterBrowserController — actions', () => {
    it('subscribe notifies on state change and unsubscribe stops it', () => {
        const { core, controller } = setup()
        let count = 0
        const unsub = controller.subscribe(() => {
            count += 1
        })
        core.emit('google-drive:files-loaded', { files: [], folderId: 'root' })
        expect(count).toBeGreaterThan(0)
        const after = count
        unsub()
        core.emit('google-drive:files-loaded', { files: [], folderId: 'root' })
        expect(count).toBe(after)
    })

    it('handleClick toggles file selection', () => {
        const { controller } = setup()
        const f = file('1', 'a.txt')
        controller.handleClick(f)
        expect(controller.getSnapshot().selectedFiles).toHaveLength(1)
        controller.handleClick(f)
        expect(controller.getSnapshot().selectedFiles).toHaveLength(0)
    })

    it('handleClick on a folder flags loading + requests it; trail unchanged until files-loaded', () => {
        const { core, controller, plugin } = setup()
        core.emit('google-drive:files-loaded', { files: [], folderId: 'root' })
        const loadSpy = vi.spyOn(plugin, 'loadFiles')
        controller.handleClick(file('f1', 'Folder', true))
        expect(controller.getSnapshot().isClickLoading).toBe(true)
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root'])
        expect(loadSpy).toHaveBeenCalledWith('f1')
    })

    it('handleSubmit downloads selection, pushes files, and closes the view', async () => {
        const { controller, onFilesSelected, onClose } = setup()
        controller.handleClick(file('1', 'a.txt'))
        controller.handleClick(file('2', 'b.txt'))
        await controller.handleSubmit()
        expect(onFilesSelected).toHaveBeenCalledTimes(1)
        expect(onFilesSelected.mock.calls[0][0]).toHaveLength(2)
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(controller.getSnapshot().selectedFiles).toHaveLength(0)
    })

    it('popup signIn runs authenticateViaPopup then loadFiles', async () => {
        const { controller, plugin } = setup(ONE_DRIVE_DESCRIPTOR)
        const popupSpy = vi.spyOn(plugin, 'authenticateViaPopup')
        const loadSpy = vi.spyOn(plugin, 'loadFiles')
        controller.signIn()
        await Promise.resolve()
        await Promise.resolve()
        expect(popupSpy).toHaveBeenCalledTimes(1)
        expect(loadSpy).toHaveBeenCalled()
    })

    it('signOut calls the plugin and clears the token', () => {
        const { controller, plugin } = setup()
        plugin.authed = true
        const signOutSpy = vi.spyOn(plugin, 'signOut')
        controller.signOut()
        expect(signOutSpy).toHaveBeenCalledTimes(1)
        expect(controller.getSnapshot().token).toBeUndefined()
    })

    it('files-loaded seeds the root folder as the path trail', () => {
        const { core, controller } = setup()
        core.emit('google-drive:files-loaded', { files: [file('f1', 'Folder', true)], folderId: 'root' })
        const snap = controller.getSnapshot()
        expect(snap.path.map(p => p.id)).toEqual(['root'])
        expect(snap.path[0].name).toBe('Drive')
    })

    it('navigating into folders accumulates a unique path trail (no duplicate, no collapse)', () => {
        const { core, controller } = setup()
        core.emit('google-drive:files-loaded', { files: [file('f1', 'Folder', true)], folderId: 'root' })
        controller.handleClick(file('f1', 'Folder', true))
        core.emit('google-drive:files-loaded', { files: [file('x', 'child.txt')], folderId: 'f1' })
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root', 'f1'])
        controller.handleClick(file('f2', 'Sub', true))
        core.emit('google-drive:files-loaded', { files: [], folderId: 'f2' })
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root', 'f1', 'f2'])
    })

    it('navigated folder crumbs show the clicked folder name, not the raw id', () => {
        const { core, controller } = setup()
        core.emit('google-drive:files-loaded', { files: [file('f1', 'Reports', true)], folderId: 'root' })
        controller.handleClick(file('f1', 'Reports', true))
        core.emit('google-drive:files-loaded', { files: [file('f2', '2024', true)], folderId: 'f1' })
        controller.handleClick(file('f2', '2024', true))
        core.emit('google-drive:files-loaded', { files: [], folderId: 'f2' })
        expect(controller.getSnapshot().path.map(p => p.name)).toEqual([
            'Drive',
            'Reports',
            '2024',
        ])
        expect(controller.getSnapshot().folder?.name).toBe('2024')
    })

    it('dropbox navigated folder crumb keeps the clicked name (path-keyed)', () => {
        const { core, controller } = setup(DROPBOX_DESCRIPTOR)
        core.emit('dropbox:files-loaded', { files: [file('/Photos', 'Photos', true, '/Photos')], path: '' })
        controller.handleClick(file('/Photos', 'Photos', true, '/Photos'))
        core.emit('dropbox:files-loaded', { files: [], path: '/Photos' })
        const last = controller.getSnapshot().path.at(-1)
        expect(last?.id).toBe('/Photos')
        expect(last?.name).toBe('Photos')
    })

    it('descend, breadcrumb-back, then descend a sibling keeps a clean unique trail', () => {
        const { core, controller } = setup()
        core.emit('google-drive:files-loaded', {
            files: [file('f1', 'Reports', true), file('f2', 'Photos', true)],
            folderId: 'root',
        })
        controller.handleClick(file('f1', 'Reports', true))
        core.emit('google-drive:files-loaded', { files: [], folderId: 'f1' })
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root', 'f1'])
        // breadcrumb-back to root (header truncates via setPath(slice(0, i+1)); no reload)
        controller.setPath(controller.getSnapshot().path.slice(0, 1))
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root'])
        // descend into a DIFFERENT sibling — must not resurrect a stale/duplicate crumb
        controller.handleClick(file('f2', 'Photos', true))
        core.emit('google-drive:files-loaded', { files: [], folderId: 'f2' })
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root', 'f2'])
        expect(controller.getSnapshot().path.map(p => p.name)).toEqual(['Drive', 'Photos'])
    })

    it('breadcrumb truncation (setPath) navigates back up the trail', () => {
        const { core, controller } = setup()
        core.emit('google-drive:files-loaded', { files: [], folderId: 'root' })
        controller.handleClick(file('f1', 'Folder', true))
        core.emit('google-drive:files-loaded', { files: [], folderId: 'f1' })
        const snap = controller.getSnapshot()
        controller.setPath(snap.path.slice(0, 1))
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root'])
    })

    it('re-loading a folder already in the trail truncates to it (no growth)', () => {
        const { core, controller } = setup()
        core.emit('google-drive:files-loaded', { files: [], folderId: 'root' })
        controller.handleClick(file('f1', 'F1', true))
        core.emit('google-drive:files-loaded', { files: [], folderId: 'f1' })
        controller.handleClick(file('f2', 'F2', true))
        core.emit('google-drive:files-loaded', { files: [], folderId: 'f2' })
        core.emit('google-drive:files-loaded', { files: [], folderId: 'f1' })
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root', 'f1'])
    })

    it('dropbox path-keyed trail accumulates by path id', () => {
        const { core, controller } = setup(DROPBOX_DESCRIPTOR)
        core.emit('dropbox:files-loaded', { files: [], path: '' })
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root'])
        core.emit('dropbox:files-loaded', { files: [], path: '/Photos' })
        expect(controller.getSnapshot().path.map(p => p.id)).toEqual(['root', '/Photos'])
    })
})
