// CONVENTION (approach B): Adapters own child controllers. Create them from the
// adapter's OWN lifecycle hook (the same hook used today) via createChildController.
// Never create child controllers inside createUploaderController.

export interface ChildControllerLike {
  init?(): void
  dispose?(): void
  destroy?(): void
  subscribe?(listener: () => void): () => void
}

export interface CreateChildControllerOptions {
  /** If provided and the controller supports subscribe(), wired on init() and unwired on dispose(). */
  onChange?: () => void
}

export interface ChildControllerHandle<C extends ChildControllerLike> {
  controller: C
  init(): void
  dispose(): void
}

export function createChildController<C extends ChildControllerLike>(
  factory: () => C,
  options: CreateChildControllerOptions = {},
): ChildControllerHandle<C> {
  const controller = factory()
  let started = false
  let stopped = false
  let unsub: (() => void) | null = null

  return {
    controller,
    init() {
      if (started) return
      started = true
      controller.init?.()
      if (options.onChange && controller.subscribe) unsub = controller.subscribe(options.onChange)
    },
    dispose() {
      if (stopped) return
      stopped = true
      unsub?.(); unsub = null
      if (controller.dispose) controller.dispose()
      else if (controller.destroy) controller.destroy()
    },
  }
}
