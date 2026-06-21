import { Component } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-audio-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="audio" />`,
})
export class AudioIconComponent {}
