import { Component, Input, inject } from '@angular/core'
import { UpupStore } from '../upup-store.service'

/**
 * Content-projection wrapper — port of SourceViewContainer.svelte.
 *
 * Svelte original:
 *   <div data-testid="upup-adapter-view" class={cn('upup-flex upup-items-center …', { … })} ...rest>
 *     {@render children?.()}
 *   </div>
 *
 * Reads: store.isDark(), store.slotOverrides() for conditional classes.
 * Inputs:
 *   - isLoading (boolean, default false) — mirrors the svelte `isLoading` prop.
 *   - slotName (string, default 'adapter-view') — replicates svelte's `...rest`
 *     forwarding of `data-upup-slot` (callers pass "audio-uploader",
 *     "camera-uploader", "url-uploader", drive-browser slots, etc.).
 */
@Component({
    selector: 'upup-adapter-view-container',
    standalone: true,
    template: `
        <div
            data-testid="upup-adapter-view"
            [attr.data-upup-slot]="slotName"
            [class]="containerClass"
        >
            <ng-content></ng-content>
        </div>
    `,
})
export class SourceViewContainerComponent {
    private store = inject(UpupStore)

    @Input() isLoading: boolean = false
    /**
     * Per-caller slot name forwarded to the inner div's data-upup-slot — mirrors
     * svelte AVC's `...rest` spread. Named `slotName` (not `slot`) to avoid the
     * native `slot` attribute.
     */
    @Input() slotName: string = 'adapter-view'

    get containerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        const parts: string[] = [
            'upup-flex upup-items-center upup-justify-center upup-overflow-hidden upup-bg-black/[0.075]',
        ]
        if (this.isLoading && dark) {
            parts.push('upup-bg-white/10 upup-text-[#FAFAFA] dark:upup-bg-white/10 dark:upup-text-[#FAFAFA]')
        } else if (!this.isLoading && slotClasses.sourceView) {
            parts.push(slotClasses.sourceView)
        }
        if (this.isLoading && slotClasses.driveLoading) {
            parts.push(slotClasses.driveLoading)
        }
        return parts.join(' ')
    }
}
