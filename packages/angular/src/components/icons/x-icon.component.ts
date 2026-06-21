import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-x-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="x" [size]="size" />`,
})
export class XIconComponent {
    @Input() size: number = 24
}
