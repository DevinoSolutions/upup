import { createUploader } from './create-uploader'
import type { CreateUploaderOptions, UpupInstance } from './lib/types'

const FORWARDED_EVENTS: Array<[coreEvent: string, domEvent: string]> = [
    ['files-added', 'upup:files-added'],
    ['file-removed', 'upup:file-removed'],
    ['upload-progress', 'upup:upload-progress'],
    ['upload-all-complete', 'upup:upload-complete'],
    // The public `upup:error` DOM event now sources the single upload-failure channel
    // (upload-error), so it fires for every upload failure — not the resume-only path.
    ['upload-error', 'upup:error'],
]

export class UpupUploaderElement extends HTMLElement {
    private _instance: UpupInstance | null = null
    private _config: CreateUploaderOptions = {}
    private forwardUnsubs: Array<() => void> = []

    /** Read-only access to the underlying imperative instance (null while disconnected). */
    get instance(): UpupInstance | null {
        return this._instance
    }

    set config(value: CreateUploaderOptions) {
        this._config = value ?? {}
        if (this.isConnected) this.remount()
    }
    get config(): CreateUploaderOptions {
        return this._config
    }

    connectedCallback() {
        this.mount()
    }
    disconnectedCallback() {
        this.unmount()
    }

    private mount() {
        if (this._instance) return
        this._instance = createUploader(this, this._config)
        for (const [coreEvent, domEvent] of FORWARDED_EVENTS) {
            this.forwardUnsubs.push(
                this._instance.on(coreEvent, (...args: unknown[]) => {
                    this.dispatchEvent(
                        new CustomEvent(domEvent, {
                            detail: args.length === 1 ? args[0] : args,
                            bubbles: true,
                            composed: true,
                        }),
                    )
                }),
            )
        }
    }

    private unmount() {
        this.forwardUnsubs.forEach(u => { u(); })
        this.forwardUnsubs = []
        this._instance?.destroy()
        this._instance = null
    }

    private remount() {
        this.unmount()
        this.mount()
    }
}

// Double-define guard: importing the module more than once must not throw.
if (
    typeof customElements !== 'undefined' &&
    !customElements.get('upup-uploader')
) {
    customElements.define('upup-uploader', UpupUploaderElement)
}
