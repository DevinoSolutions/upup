import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-file-icon-svg',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="file" [class]="className" />`,
})
export class FileIconSvgComponent {
    @Input('class') className: string = ''
}
