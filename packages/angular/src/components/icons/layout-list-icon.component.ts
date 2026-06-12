import { Component, Input } from '@angular/core'

@Component({
    selector: 'upup-icon-layout-list',
    standalone: true,
    template: `
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="4" width="16" height="6" rx="1" />
            <rect x="4" y="14" width="16" height="6" rx="1" />
        </svg>
    `,
})
export class LayoutListIconComponent {
    @Input() size: number = 24
}
