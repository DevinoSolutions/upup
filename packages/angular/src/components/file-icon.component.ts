import { Component, Input, inject } from '@angular/core'
import { fileTypeIconName, type IconName } from '@upup/core'
import { cn } from '@upup/core/internal'
import { UpupStore } from '../upup-store.service'
import { FileIconSvgComponent } from './icons/file-icon-svg.component'

@Component({
    selector: 'upup-file-icon',
    standalone: true,
    imports: [FileIconSvgComponent],
    template: `
        <span
            class="upup-inline-flex"
            data-testid="upup-file-icon"
            data-upup-slot="file-icon"
        >
            <upup-file-icon-svg [name]="iconName" [class]="iconClass" />
        </span>
    `,
})
export class FileIconComponent {
    readonly store = inject(UpupStore)

    @Input() extension: string = ''
    @Input('class') extraClass: string = ''

    get iconName(): IconName {
        return fileTypeIconName(this.extension)
    }

    get iconClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-text-5xl upup-text-blue-600',
            this.extraClass,
            dark ? 'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]' : '',
        )
    }
}
