import type { ObservableController } from '../controllers/types'

export type MotionMode = 'on' | 'off'

export interface MotionGateParams {
    /** The public `animations` prop. Default true. */
    animations: boolean | undefined
    /** Injectable for tests/SSR; defaults to window.matchMedia when present. */
    matchMedia?:
        | ((query: string) => {
              matches: boolean
              addEventListener(
                  type: 'change',
                  cb: (e: { matches: boolean }) => void,
              ): void
              removeEventListener(
                  type: 'change',
                  cb: (e: { matches: boolean }) => void,
              ): void
          })
        | undefined
}

export type MotionGate = ObservableController<MotionMode>

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Resolves the ONE `data-motion` value: off when the consumer opted out
 * (`animations={false}`) OR the OS asks for reduced motion. Frameworks write
 * the snapshot onto the uploader-panel element and re-write it on change.
 */
export function createMotionGate({
    animations,
    matchMedia = typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
        ? window.matchMedia.bind(window)
        : undefined,
}: MotionGateParams): MotionGate {
    const listeners = new Set<() => void>()
    let reduced = false
    let mql: ReturnType<NonNullable<MotionGateParams['matchMedia']>> | null =
        null

    const onChange = (e: { matches: boolean }) => {
        reduced = e.matches
        listeners.forEach(l => {
            l()
        })
    }

    if (matchMedia) {
        mql = matchMedia(REDUCE_QUERY)
        reduced = mql.matches
        mql.addEventListener('change', onChange)
    }

    return {
        getSnapshot: () => (animations === false || reduced ? 'off' : 'on'),
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        destroy() {
            mql?.removeEventListener('change', onChange)
            listeners.clear()
        },
    }
}
