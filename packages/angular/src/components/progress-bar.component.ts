import { Component, Input, inject } from '@angular/core'
import { isUploadActive } from '@upup/core'
import { UpupStore } from '../upup-store.service'

/**
 * Progress bar — port of ProgressBar.svelte.
 *
 * Svelte original:
 *   {#if !!progress || isUploadActive($uploadStatus)}
 *     <div data-testid="upup-progress-bar" role="progressbar" aria-valuenow={progress} …>
 *       <div class="…track…"><div style="width: {progress}%" class="…fill…"></div></div>
 *       {#if !!showValue}<p>{progress}%</p>{/if}
 *     </div>
 *   {/if}
 *
 * Reads: store.uploadStatus(), store.isDark(), store.slotOverrides(), store.slots(),
 *        store.translations() (for aria-label).
 * Inputs: progress (required), showValue (default false), progressBarClassName, className.
 */
@Component({
    selector: 'upup-progress-bar',
    standalone: true,
    template: `
        @if (shouldShow) {
            <div
                data-testid="upup-progress-bar"
                data-upup-slot="progress-bar"
                role="progressbar"
                [attr.aria-valuenow]="progress"
                aria-valuemin="0"
                aria-valuemax="100"
                [attr.aria-label]="store.translations().uploadProgress"
                [class]="containerClass"
            >
                <div [class]="trackClass">
                    <div [style.width.%]="progress" [class]="fillClass"></div>
                </div>
                @if (showValue) {
                    <p [class]="textClass">{{ progress }}%</p>
                }
            </div>
        }
    `,
})
export class ProgressBarComponent {
    readonly store = inject(UpupStore)

    @Input() progress: number = 0
    @Input() showValue: boolean = false
    @Input() progressBarClassName: string = ''
    @Input() className: string = ''

    get shouldShow(): boolean {
        return !!this.progress || isUploadActive(this.store.uploadStatus())
    }

    get containerClass(): string {
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return [
            'upup-flex upup-items-center upup-gap-2',
            this.className,
            slotClasses.progressBarContainer ?? '',
            themeSlots?.progressBar?.root ?? '',
        ]
            .filter(Boolean)
            .join(' ')
    }

    get trackClass(): string {
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return [
            'upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px] upup-bg-[#F5F5F5]',
            this.progressBarClassName,
            slotClasses.progressBar ?? '',
            themeSlots?.progressBar?.track ?? '',
        ]
            .filter(Boolean)
            .join(' ')
    }

    get fillClass(): string {
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return [
            'upup-h-full upup-bg-[#8EA5E7]',
            slotClasses.progressBarInner ?? '',
            themeSlots?.progressBar?.fill ?? '',
        ]
            .filter(Boolean)
            .join(' ')
    }

    get textClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return [
            'upup-text-xs upup-font-semibold',
            dark ? 'upup-text-white' : '',
            slotClasses.progressBarText ?? '',
            themeSlots?.progressBar?.text ?? '',
        ]
            .filter(Boolean)
            .join(' ')
    }
}
