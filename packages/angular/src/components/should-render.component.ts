import { Component, Input } from '@angular/core'

/**
 * Pure conditional wrapper — port of ShouldRender.svelte.
 *
 * Svelte original:
 *   {#if isLoading} <Loader /> {:else if condition} {@render children?.()} {/if}
 *
 * The Angular port renders <ng-content> when `when` is true and isLoading is false.
 * For the loading branch we render nothing here (the LoaderIcon is injected via the
 * store's uiProps in the parent; downstream components handle the loader slot themselves).
 * This keeps ShouldRender a pure leaf with zero store dependency.
 */
@Component({
    selector: 'upup-should-render',
    standalone: true,
    template: `
        @if (when && !isLoading) {
            <ng-content></ng-content>
        }
    `,
})
export class ShouldRenderComponent {
    /** Maps to svelte's `if` prop. Render children when true (and not loading). */
    @Input() when: boolean = false
    /** When true, suppresses the content (loading branch). Defaults to false. */
    @Input() isLoading: boolean = false
}
