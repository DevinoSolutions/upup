import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-folder-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="folder" [class]="className" />`,
})
export class FolderIconComponent {
    @Input('class') className: string = ''
}
