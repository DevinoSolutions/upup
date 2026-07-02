import { Component } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-dropbox-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="dropbox" />`,
})
export class DropboxIconComponent {}
