import { Component, Input, inject } from '@angular/core'
import { cn } from '@upup/core'
import { UpupStore } from '../upup-store.service'
import { FileIconSvgComponent } from './icons/file-icon-svg.component'

/**
 * FileIcon — port of FileIcon.svelte.
 *
 * Svelte original:
 *   <div class="upup-flex upup-flex-col upup-items-center upup-gap-0.5">
 *     <FileIconSvg class={iconClass} />
 *     {#if extension}<span …>{extension}</span>{/if}
 *   </div>
 *
 * Reads: store.isDark() for colour variant.
 * Input: extension (string), className (forwarded via [class]).
 */
@Component({
    selector: 'upup-file-icon',
    standalone: true,
    imports: [FileIconSvgComponent],
    template: `
        <div class="upup-flex upup-flex-col upup-items-center upup-gap-0.5" data-testid="upup-file-icon" data-upup-slot="file-icon">
            <upup-file-icon-svg [class]="iconClass" />
            @if (extension) {
                <span class="upup-text-[10px] upup-font-medium upup-uppercase upup-text-gray-500">
                    {{ extension }}
                </span>
            }
        </div>
    `,
})
export class FileIconComponent {
    readonly store = inject(UpupStore)

    @Input() extension: string = ''
    /** Forwarded additional CSS classes (maps to svelte's class={…}). */
    @Input('class') extraClass: string = ''

    get iconClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-text-5xl upup-text-blue-600',
            this.extraClass,
            dark ? 'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]' : '',
        )
    }
}
