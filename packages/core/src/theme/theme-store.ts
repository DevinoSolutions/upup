import { resolveTheme } from './resolve-theme'
import { flattenSlotsToClassNames } from './slots'
import type { DeepPartialSlots, InternalFlatClassNames } from './slots'
import type {
    UpupThemeConfig,
    UpupThemeTokens,
    UpupResolvedTheme,
} from './types'

type ResolvedLightDark = Omit<UpupResolvedTheme, 'mode'> & {
    mode: 'light' | 'dark'
}

/**
 * Structural equality for two theme configs. Configs are tiny, so JSON.stringify
 * of `tokens`/`slots` (plus a direct `mode` compare) is enough. Lets
 * setThemeConfig short-circuit when a consumer inlines a fresh object literal
 * (e.g. theme={{ mode: 'dark' }}) on every render without an actual change.
 */
function themeConfigEqual(a?: UpupThemeConfig, b?: UpupThemeConfig): boolean {
    if (a === b) return true
    return (
        a?.mode === b?.mode &&
        JSON.stringify(a?.tokens) === JSON.stringify(b?.tokens) &&
        JSON.stringify(a?.slots) === JSON.stringify(b?.slots)
    )
}

export interface ThemeStoreState {
    themeMode: 'light' | 'dark'
    isDark: boolean
    tokens: UpupThemeTokens
    resolved: ResolvedLightDark
    slotOverrides: InternalFlatClassNames
    slots: DeepPartialSlots
}

/**
 * Framework-agnostic theme store. Owns the `system` matchMedia subscription and
 * the resolution of a tri-state theme mode ('light' | 'dark' | 'system') into a
 * concrete 'light' | 'dark' + tokens/slots. Mirrors UploaderOrchestrator's
 * subscribe/getSnapshot pattern. SSR-safe: init() no-ops without window.
 */
export class ThemeStore {
    private state: ThemeStoreState
    private listeners = new Set<() => void>()
    private config?: UpupThemeConfig | undefined
    private systemMode: 'light' | 'dark' = 'light'
    private mediaCleanup: (() => void) | null = null

    constructor(config?: UpupThemeConfig) {
        this.config = config
        this.state = this.compute()
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    getSnapshot = (): ThemeStoreState => this.state

    /** Start the `system` matchMedia subscription (no-op for explicit modes / SSR). */
    init(): void {
        const requested = this.config?.mode ?? 'light'
        if (requested !== 'system') return
        if (
            typeof window === 'undefined' ||
            typeof window.matchMedia !== 'function'
        )
            return
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const update = () => {
            this.systemMode = media.matches ? 'dark' : 'light'
            this.recompute()
        }
        update()
        media.addEventListener('change', update)
        this.mediaCleanup = () => {
            media.removeEventListener('change', update)
        }
    }

    /** Re-resolve when the host's theme config prop changes. */
    setThemeConfig(config?: UpupThemeConfig): void {
        if (themeConfigEqual(this.config, config)) return
        this.config = config
        this.recompute()
    }

    private compute(): ThemeStoreState {
        const requested = this.config?.mode ?? 'light'
        const effective: 'light' | 'dark' =
            requested === 'system' ? this.systemMode : requested
        const resolved = resolveTheme({
            ...(this.config ?? {}),
            mode: effective,
        }) as ResolvedLightDark
        return {
            themeMode: effective,
            isDark: effective === 'dark',
            tokens: resolved.tokens,
            resolved,
            slotOverrides: flattenSlotsToClassNames(resolved.slots),
            slots: resolved.slots,
        }
    }

    private recompute(): void {
        this.state = this.compute()
        this.notify()
    }

    private notify(): void {
        this.listeners.forEach(fn => {
            fn()
        })
    }

    destroy(): void {
        this.mediaCleanup?.()
        this.mediaCleanup = null
        this.listeners.clear()
    }
}
