import { render, nothing } from 'lit-html'
import { buildRootContext } from './context'
import { createRenderLoop } from './app'
import { resolveTarget } from './lib/dom'
import { disposeFileList } from './templates/file-list'
import type { CreateUploaderOptions, UpupInstance, UploaderSnapshot } from './lib/types'

export function createUploader(
  target: string | HTMLElement,
  options: CreateUploaderOptions = {},
): UpupInstance {
  const el = resolveTarget(target)

  // forward-ref invalidate cell (loop is created after context)
  let loopInvalidate: () => void = () => {}
  const built = buildRootContext(options, () => loopInvalidate())
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
      activeAdapter: o.activeAdapter,
      viewMode: o.viewMode,
    }
  }
  const emit = () => {
    const s = snapshot()
    subscribers.forEach((cb) => cb(s))
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
    addFiles: (files) => ctx.core.addFiles(files),
    removeFile: (id) => ctx.handleFileRemove(id),
    removeAll: () => ctx.core.removeAll(),
    setFiles: (files) => ctx.setFiles(files),
    reorderFiles: (ids) => ctx.core.reorderFiles(ids),
    upload: () => ctx.core.upload(),
    pause: () => ctx.handlePause(),
    resume: () => ctx.handleResume(),
    cancel: () => ctx.handleCancel(),
    retry: (id?: string) => ctx.core.retry(id),
    on: (event, h) => ctx.core.on(event, h),
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
      built.dispose()
      disposeFileList(ctx)
      render(nothing, el)
    },
  }
  return instance
}

export type { UpupInstance, CreateUploaderOptions, UploaderSnapshot }
