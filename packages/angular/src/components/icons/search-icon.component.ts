import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-search-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="search" [class]="className" />`,
})
export class SearchIconComponent {
    @Input('class') className: string = ''
}
