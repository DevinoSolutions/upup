import { render, nothing } from 'lit-html'
import { buildUploaderContext } from './context'
import { createRenderLoop } from './app'
import { resolveTarget } from './lib/dom'
import { destroyFileList } from './templates/file-list'
import { destroyServerDrives } from './templates/server-mode-drive-uploader'
import type {
    CreateUploaderOptions,
    UpupInstance,
    UploaderSnapshot,
} from './lib/types'

export function createUploader(
    target: string | HTMLElement,
    options: CreateUploaderOptions = {},
): UpupInstance {
    const el = resolveTarget(target)

    // forward-ref invalidate cell (loop is created after context)
    let loopInvalidate: () => void = () => {}
    const built = buildUploaderContext(options, () => {
        loopInvalidate()
    })
    const { ctx } = built
    const loop = createRenderLoop(ctx, el)
    loopInvalidate = loop.invalidate

    // subscribe the loop to all stores + emit snapshot to subscribers
    const subscribers = new Set<(s: UploaderSnapshot) => void>()
    const snapshot = (): UploaderSnapshot => {
        const o = ctx.orchestrator.getSnapshot()
        return {
            files: [...ctx.core.files.values()],
            status: ctx.core.status,
            progress: ctx.core.progress,
            error: ctx.core.error,
            activeSource: o.activeSource,
            viewMode: o.viewMode,
        }
    }
    const emit = () => {
        const s = snapshot()
        subscribers.forEach(cb => {
            cb(s)
        })
    }
    const unsubAll = built.subscribeAll(() => {
        loop.invalidate()
        emit()
    })

    // first paint + init
    loop.renderApp()
    built.init()
    loop.renderApp()

    let dead = false
    const instance: UpupInstance = {
        getState: snapshot,
        subscribe(cb) {
            subscribers.add(cb)
            cb(snapshot())
            return () => subscribers.delete(cb)
        },
        addFiles: files => ctx.core.addFiles(files),
        removeFile: id => {
            ctx.handleFileRemove(id)
        },
        removeAll: () => {
            ctx.handleRemoveAll()
        },
        setFiles: files => ctx.setFiles(files),
        reorderFiles: ids => {
            ctx.core.reorderFiles(ids)
        },
        upload: () => ctx.core.upload(),
        pause: () => {
            ctx.handlePause()
        },
        resume: () => {
            ctx.handleResume()
        },
        cancel: () => {
            ctx.handleCancel()
        },
        retry: (id?: string) => ctx.core.retry(id),
        // Untyped passthrough — this port's public `on` stays string-typed;
        // the typed CoreEvents surface lives on core itself (F-723).
        on: (event, h) =>
            (
                ctx.core.on as (
                    ev: string,
                    hh: (p: unknown) => void,
                ) => () => void
            )(event, h),
        ext: ctx.core.ext,
        core: ctx.core,
        el,
        destroy() {
            if (dead) return
            dead = true
            loopInvalidate = () => {}
            loop.stop()
            unsubAll()
            subscribers.clear()
            built.destroy()
            destroyFileList(ctx)
            destroyServerDrives(ctx)
            render(nothing, el)
        },
    }
    return instance
}

export type { UpupInstance, CreateUploaderOptions, UploaderSnapshot }
