import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-player-pause-filled-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="player-pause" [size]="size" />`,
})
export class PlayerPauseFilledIconComponent {
    @Input() size: number = 24
}
