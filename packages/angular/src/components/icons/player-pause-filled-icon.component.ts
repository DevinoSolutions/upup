import { Component, Input } from '@angular/core'

@Component({
    selector: 'upup-icon-player-pause-filled',
    standalone: true,
    template: `
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
    `,
})
export class PlayerPauseFilledIconComponent {
    @Input() size: number = 24
}
