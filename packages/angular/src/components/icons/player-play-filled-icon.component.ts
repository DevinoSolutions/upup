import { Component, Input } from '@angular/core'

@Component({
    selector: 'upup-icon-player-play-filled',
    standalone: true,
    template: `
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M6 4l15 8-15 8z" />
        </svg>
    `,
})
export class PlayerPlayFilledIconComponent {
    @Input() size: number = 24
}
