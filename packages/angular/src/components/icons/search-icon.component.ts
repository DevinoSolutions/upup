import { Component, Input } from '@angular/core'

@Component({
    selector: 'upup-icon-search',
    standalone: true,
    template: `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [class]="className">
            <circle cx="10" cy="10" r="7" />
            <line x1="21" y1="21" x2="15" y2="15" />
        </svg>
    `,
})
export class SearchIconComponent {
    @Input('class') className: string = ''
}
