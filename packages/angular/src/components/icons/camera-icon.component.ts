import { Component } from '@angular/core'
import { IconComponent } from '../icon.component'

@Component({
    selector: 'upup-camera-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="camera" />`,
})
export class CameraIconComponent {}
