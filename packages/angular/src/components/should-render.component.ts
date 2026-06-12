import { Component, Input, inject, Type } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { UpupStore } from '../upup-store.service'

/**
 * Conditional wrapper — 1:1 port of ShouldRender.svelte.
 *
 * Svelte original:
 *   const Loader = icons.LoaderIcon
 *   {#if isLoading}
 *     <Loader />
 *   {:else if condition}
 *     {@render children?.()}
 *   {/if}
 *
 * Faithful parity: when `isLoading` is true, render the configured loader
 * (`store.uiProps.icons.LoaderIcon`, which defaults to EmptyIcon) — exactly like
 * svelte renders `icons.LoaderIcon`. Otherwise render projected content when `when`
 * (svelte's `if`) is true. No wrapper element / no testid around the loader (svelte
 * renders the bare `<Loader />`).
 */
@Component({
    selector: 'upup-should-render',
    standalone: true,
    imports: [NgComponentOutlet],
    template: `
        @if (isLoading) {
            <ng-container [ngComponentOutlet]="loader" />
        } @else if (when) {
            <ng-content></ng-content>
        }
    `,
})
export class ShouldRenderComponent {
    private store = inject(UpupStore)

    /** Maps to svelte's `if` prop. Render children when true (and not loading). */
    @Input() when: boolean = false
    /** When true, render the configured loader instead of the content (svelte parity). */
    @Input() isLoading: boolean = false

    /** Resolved loader component — mirrors svelte's `const Loader = icons.LoaderIcon`. */
    get loader(): Type<unknown> {
        return this.store.uiProps.icons.LoaderIcon as Type<unknown>
    }
}
