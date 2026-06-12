import { Component, Input, inject } from '@angular/core'
import { UpupStore } from '../upup-store.service'

/**
 * Content-projection wrapper — port of AdapterViewContainer.svelte.
 *
 * Svelte original:
 *   <div data-testid="upup-adapter-view" class={cn('upup-flex upup-items-center …', { … })} ...rest>
 *     {@render children?.()}
 *   </div>
 *
 * Reads: store.isDark(), store.slotOverrides() for conditional classes.
 * Input: isLoading (boolean, default false) — mirrors the svelte `isLoading` prop.
 */
@Component({
    selector: 'upup-adapter-view-container',
    standalone: true,
    template: `
        <div
            data-testid="upup-adapter-view"
            data-upup-slot="adapter-view"
            [class]="containerClass"
        >
            <ng-content></ng-content>
        </div>
    `,
})
export class AdapterViewContainerComponent {
    private store = inject(UpupStore)

    @Input() isLoading: boolean = false

    get containerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        const parts: string[] = [
            'upup-flex upup-items-center upup-justify-center upup-overflow-hidden upup-bg-black/[0.075]',
        ]
        if (this.isLoading && dark) {
            parts.push('upup-bg-white/10 upup-text-[#FAFAFA] dark:upup-bg-white/10 dark:upup-text-[#FAFAFA]')
        } else if (!this.isLoading && slotClasses.adapterView) {
            parts.push(slotClasses.adapterView)
        }
        if (this.isLoading && slotClasses.driveLoading) {
            parts.push(slotClasses.driveLoading)
        }
        return parts.join(' ')
    }
}
