import { Injectable, signal } from '@angular/core'

/**
 * DOM host inside the SourceView header row, just before the Back button.
 * A source view portals its right-side header extras into it (e.g. the drive
 * browser's avatar + log out + separator) so account controls share the top row
 * instead of occupying their own strip. The signal holds null until the host
 * span mounts; consumers guard their portal on it. Angular has no <Teleport>, so
 * a shared host element + an appendChild portal (in the consuming component) is
 * the framework idiom mirroring React's SourceViewHeaderExtraContext /
 * Vue's <Teleport> / Svelte's context store + portal action.
 *
 * Component-scoped: provided at the <upup-uploader> level (alongside UpupStore)
 * so SourceView (provider) and the drive uploader (consumer) share one instance.
 */
@Injectable()
export class SourceViewHeaderExtraService {
    /** The host element SourceView exposes; null until its header span mounts. */
    readonly host = signal<HTMLElement | null>(null)

    setHost(el: HTMLElement | null): void {
        this.host.set(el)
    }
}
