import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'
import type { IconName } from '@upupjs/core'

@Component({
    selector: 'upup-file-icon-svg',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon [name]="name" [class]="className" />`,
})
export class FileIconSvgComponent {
    @Input() name: IconName = 'file'
    @Input('class') className: string = ''
}
