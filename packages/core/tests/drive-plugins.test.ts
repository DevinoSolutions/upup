import { describe, it, expect } from 'vitest'
import { EventEmitter } from '../src/events'
import { UpupCore } from '../src/core'
import { DropboxPlugin } from '../src/drives/dropbox-plugin'
import { GoogleDrivePlugin } from '../src/drives/google-drive-plugin'
import { BoxPlugin } from '../src/drives/box-plugin'
import { OneDrivePlugin } from '../src/drives/one-drive-plugin'

describe('adapter plugin stubs', () => {
    it('DropboxPlugin initializes with config', () => {
        const plugin = new DropboxPlugin()
        plugin.configure({ clientId: 'test-id' })
        expect(plugin.id).toBe('dropbox')
        expect(plugin.getConfig().clientId).toBe('test-id')
    })

    it('GoogleDrivePlugin initializes with config', () => {
        const plugin = new GoogleDrivePlugin()
        plugin.configure({ apiKey: 'k', appId: 'a', clientId: 'c' })
        expect(plugin.id).toBe('google-drive')
        expect(plugin.getConfig().clientId).toBe('c')
    })

    it('BoxPlugin initializes with config', () => {
        const plugin = new BoxPlugin()
        plugin.configure({ clientId: 'test' })
        expect(plugin.id).toBe('box')
        expect(plugin.getConfig().clientId).toBe('test')
    })

    it('OneDrivePlugin initializes with config', () => {
        const plugin = new OneDrivePlugin()
        plugin.configure({ clientId: 'test' })
        expect(plugin.id).toBe('one-drive')
        expect(plugin.getConfig().clientId).toBe('test')
    })

    it('plugins accept emitter via init and release via destroy', () => {
        const emitter = new EventEmitter()
        const plugins = [
            new DropboxPlugin(),
            new GoogleDrivePlugin(),
            new BoxPlugin(),
            new OneDrivePlugin(),
        ]
        plugins.forEach(p => {
            p.init(emitter)
            p.destroy()
        })
    })

    // Regression: registering an adapter plugin via core.use() must wire its
    // event emitter to core's bus. Without this, every adapter event
    // (e.g. 'google-drive:files-loaded') is silently dropped — the React/Vue
    // drive browser fetched files (HTTP 200) but stayed stuck on the spinner
    // because onFilesLoaded never fired.
    it('core.use() wires an adapter plugin emitter so its events reach core.on()', () => {
        const core = new UpupCore({})
        const plugin = new GoogleDrivePlugin()
        plugin.configure({ apiKey: 'k', appId: 'a', clientId: 'c' })
        core.use(plugin)

        let signedOut = false
        core.on('google-drive:signed-out', () => {
            signedOut = true
        })

        // signOut() emits 'google-drive:signed-out' through the plugin's emitter
        plugin.signOut()

        expect(signedOut).toBe(true)
    })
})
