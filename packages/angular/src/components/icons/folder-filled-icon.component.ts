import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-folder-filled-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="folder-filled" [class]="className" />`,
})
export class FolderFilledIconComponent {
    @Input('class') className: string = ''
}
