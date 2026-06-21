import { Component } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-icon-my-device',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="my-device" />`,
})
export class MyDeviceIconComponent {}
