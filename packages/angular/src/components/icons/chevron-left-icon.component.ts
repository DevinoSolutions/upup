import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-chevron-left-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="chevron-left" [class]="className" />`,
})
export class ChevronLeftIconComponent {
    @Input('class') className: string = ''
}
