import { Component } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-google-drive-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="google-drive" />`,
})
export class GoogleDriveIconComponent {}
