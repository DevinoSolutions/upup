import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-icon-layout-list',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="layout-list" [size]="size" />`,
})
export class LayoutListIconComponent {
    @Input() size: number = 24
}
