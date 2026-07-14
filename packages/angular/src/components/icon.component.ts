import { Component, Input, inject, type OnChanges } from '@angular/core'
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser'
import { ICONS, type IconName } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'

@Component({
    selector: 'upup-icon',
    standalone: true,
    template: `<svg
        xmlns="http://www.w3.org/2000/svg"
        [attr.viewBox]="def.viewBox"
        [attr.width]="px"
        [attr.height]="px"
        [attr.fill]="def.attrs?.['fill'] ?? null"
        [attr.stroke]="def.attrs?.['stroke'] ?? null"
        [attr.stroke-width]="def.attrs?.['stroke-width'] ?? null"
        [attr.stroke-linecap]="def.attrs?.['stroke-linecap'] ?? null"
        [attr.stroke-linejoin]="def.attrs?.['stroke-linejoin'] ?? null"
        [attr.fill-rule]="def.attrs?.['fill-rule'] ?? null"
        [class]="klass"
        [innerHTML]="safeInner"
    ></svg>`,
})
export class IconComponent implements OnChanges {
    private sanitizer = inject(DomSanitizer)
    @Input({ required: true }) name!: IconName
    @Input() size?: number
    @Input('class') className = ''

    def = ICONS['x']
    px = 24
    klass = ''
    safeInner: SafeHtml = ''

    ngOnChanges(): void {
        this.def = ICONS[this.name]
        this.px = this.size ?? this.def.defaultSize
        this.klass = cn(this.def.className, this.className)
        this.safeInner = this.sanitizer.bypassSecurityTrustHtml(this.def.inner)
    }
}
