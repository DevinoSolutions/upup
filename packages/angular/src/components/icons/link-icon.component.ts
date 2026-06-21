import { Component } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-link-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="link" />`,
})
export class LinkIconComponent {}
