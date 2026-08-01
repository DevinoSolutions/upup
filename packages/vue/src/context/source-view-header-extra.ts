import { inject, provide, type InjectionKey, type Ref } from 'vue'

/**
 * DOM host inside the SourceView header row, just before the Back button.
 * A source view teleports its right-side header extras into it (e.g. the drive
 * browser's avatar + log out + separator) so account controls share the top
 * row instead of occupying their own strip. The provided ref is null until the
 * host span mounts; consumers guard their <Teleport> on it. Mirrors React's
 * SourceViewHeaderExtraContext (createPortal → <Teleport> is the Vue idiom).
 */
const SourceViewHeaderExtraKey: InjectionKey<Ref<HTMLElement | null>> = Symbol(
    'upup-source-view-header-extra',
)

export function provideSourceViewHeaderExtra(
    host: Ref<HTMLElement | null>,
): void {
    provide(SourceViewHeaderExtraKey, host)
}

export function useSourceViewHeaderExtra(): Ref<HTMLElement | null> | null {
    return inject(SourceViewHeaderExtraKey, null)
}
