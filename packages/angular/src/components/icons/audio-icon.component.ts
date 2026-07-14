import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-audio-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="audio" [class]="className" />`,
})
export class AudioIconComponent {
    @Input('class') className = ''
}
