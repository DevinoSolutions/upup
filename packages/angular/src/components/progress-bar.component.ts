import { Component, Input, inject } from '@angular/core'
import { isUploadActive, cn } from '@upupjs/core/internal'
import { UpupStore } from '../upup-store.service'

/**
 * Progress bar — port of shared/ProgressBar.
 *
 * The `className` positioning classes land on the INNER container div via the
 * @Input (never `class=` on the host), so the transparent `<upup-progress-bar>`
 * host is unwrapped by the parity normalizer and the DOM matches React's div
 * (F-712). At idle (no progress, not uploading) shouldShow is false, so the host
 * renders empty and contributes nothing — matching React's `null` return.
 *
 * Reads: store.uploadStatus(), store.isDark(), store.slotOverrides(), store.slots(),
 *        store.translations() (aria-label).
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
                    @if (isUploadActive(store.uploadStatus())) {
                        <div
                            aria-hidden="true"
                            class="upup-animate-fx-sheen upup-pointer-events-none upup-absolute upup-inset-y-0 upup-left-0 upup-w-2/5"
                            style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)"
                        ></div>
                    }
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

    readonly isUploadActive = isUploadActive

    get shouldShow(): boolean {
        return !!this.progress || isUploadActive(this.store.uploadStatus())
    }

    get containerClass(): string {
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return cn(
            'upup-flex upup-items-center upup-gap-2',
            this.className,
            slotClasses.progressBarContainer ?? '',
            themeSlots.progressBar?.root ?? '',
        )
    }

    get trackClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return cn(
            'upup-relative upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px]',
            dark ? 'upup-bg-white/[0.12]' : 'upup-bg-[#F5F5F5]',
            this.progressBarClassName,
            slotClasses.progressBar ?? '',
            themeSlots.progressBar?.track ?? '',
        )
    }

    get fillClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return cn(
            'upup-fx-progress-fill upup-fx-essential upup-h-full',
            dark ? 'upup-bg-[#38bdf8]' : 'upup-bg-[#0ea5e9]',
            slotClasses.progressBarInner ?? '',
            themeSlots.progressBar?.fill ?? '',
        )
    }

    get textClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        const themeSlots = this.store.slots()
        return cn(
            'upup-text-xs upup-font-semibold',
            dark ? 'upup-text-white' : '',
            slotClasses.progressBarText ?? '',
            themeSlots.progressBar?.text ?? '',
        )
    }
}
