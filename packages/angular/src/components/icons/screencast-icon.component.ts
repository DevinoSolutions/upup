import { Component } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-screencast-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="screen-cast" />`,
})
export class ScreenCastIconComponent {}
