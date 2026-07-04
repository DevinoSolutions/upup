import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-box-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="box" [class]="className" />`,
})
export class BoxIconComponent {
    @Input('class') className = ''
}
