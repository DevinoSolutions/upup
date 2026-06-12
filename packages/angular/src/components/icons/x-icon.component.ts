import { Component, Input } from '@angular/core'

@Component({
    selector: 'upup-x-icon',
    standalone: true,
    template: `
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    `,
})
export class XIconComponent {
    @Input() size: number = 24
}
