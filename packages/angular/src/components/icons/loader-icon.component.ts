import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-icon-loader',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="loader" [class]="className" />`,
})
export class LoaderIconComponent {
    @Input('class') className: string = ''
}
